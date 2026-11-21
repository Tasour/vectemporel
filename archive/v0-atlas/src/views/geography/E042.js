import { register } from './registry.js';

/* Lentille E042 — vue GEOGRAPHIE.
 * Thème : rôles ARIA des marqueurs.
 *
 * Les dix chantiers E042-01 … E042-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E042.md. Tout est local : aucune requête
 * réseau, aucune graine aléatoire, aucune console, aucun fichier partagé
 * modifié. Le contenu pédagogique est du texte sémantique réel (titres,
 * paragraphes, tableaux, fieldsets, légendes) présent dans le DOM même sans
 * interaction ; le canvas n'est qu'un laboratoire qui illustre des attributs
 * ARIA déterministes relevés sur les marqueurs réels de la carte.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-e042';
const PANEL_ID = 'geography-e042-panel';
const TITLE_ID = 'geography-e042-title';
const INVENTORY_ID = 'geography-e042-inventory';
const ROLES_ID = 'geography-e042-roles';
const ROLE_FS_ID = 'geography-e042-role';
const NAME_FS_ID = 'geography-e042-name';
const NAME_OUT_ID = 'geography-e042-name-value';
const CANVAS_ID = 'geography-e042-canvas';
const LEGEND_ID = 'geography-e042-legend';
const READOUT_ID = 'geography-e042-readout';
const PLAY_ID = 'geography-e042-play';
const RESET_ID = 'geography-e042-reset';
const BADGE_ID = 'geography-e042-badge';

/* Rôles candidats pour un marqueur : le libellé, la classe de forme et une
   explication fondée sur WAI-ARIA 1.2 (rôle, comportement clavier, verdict). */
const ROLES = {
  button: {
    label: 'button',
    shape: 'cercle',
    detail: 'Action : activer le marqueur. Le focus et la touche Entrée/Espace déclenchent l’action. C’est le rôle actuellement porté par les marqueurs de la carte.',
    verdict: 'Correct pour une action ; aria-pressed convient si l’état bascule.',
  },
  radio: {
    label: 'radio',
    shape: 'cercle pointé',
    detail: 'Choix unique dans un radiogroup : une seule sélection parmi tous les lieux. Flèches pour naviguer, case cochée pour l’élément courant.',
    verdict: 'Plus exact si la carte est un choix exclusif de lieu.',
  },
  link: {
    label: 'link',
    shape: 'rectangle arrondi',
    detail: 'Navigation : conduire à une autre vue ou une autre ressource. Le focus et Entrée suivent le lien.',
    verdict: 'Inadapté ici : un clic change de lieu, il ne navigue pas.',
  },
  img: {
    label: 'img',
    shape: 'carré',
    detail: 'Image porteuse d’un nom, sans interaction. Retiré de l’ordre de tabulation, il ne répond pas au clic.',
    verdict: 'Perd l’action : à réserver à un repère purement décoratif.',
  },
};
const ROLE_ORDER = ['button', 'radio', 'link', 'img'];

/* Sources du nom accessible, par ordre de priorité (accname 1.2 : aria-labelledby
   > aria-label > contenu texte > rôle seul). */
const SOURCES = {
  'aria-label': {
    label: 'aria-label',
    text: 'Observatoire de Paris · lieu actif',
    detail: 'Nom fourni directement par l’attribut aria-label : prioritaire sur le contenu visible.',
  },
  'aria-labelledby': {
    label: 'aria-labelledby',
    text: 'Observatoire de Paris (repère historique)',
    detail: 'Nom repris du texte d’un élément référencé : il l’emporte même sur aria-label.',
  },
  texte: {
    label: 'contenu texte',
    text: 'Observatoire de Paris',
    detail: 'Nom calculé à partir du nœud <text> enfant, en l’absence d’attribut de nommage.',
  },
  aucun: {
    label: 'aucune',
    text: '',
    detail: 'Aucun nom : l’outil d’assistance n’annonce que le rôle, sans préciser le lieu.',
  },
};
const SOURCE_ORDER = ['aria-label', 'aria-labelledby', 'texte', 'aucun'];

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  role: 'button',
  source: 'aria-label',
  playing: false,
  tourIndex: 0,
  lastTs: 0,
  rafId: 0,
  visibilityBound: false,
  motionBound: false,
  tourNodes: [],
  nodes: {},
};

/* ---------- Formules déterministes et formatage français ---------- */

const fmt = (n, d) => {
  const p = Math.pow(10, d);
  return (Math.round(n * p) / p).toFixed(d).replace('.', ',');
};

/* Nom accessible tel qu'un outil d'assistance le restitue : priorité à
   aria-labelledby, puis aria-label, puis contenu texte, puis rôle seul. */
function accessibleName(roleKey, sourceKey) {
  if (sourceKey === 'aria-labelledby') {
    return { text: SOURCES['aria-labelledby'].text, origin: 'aria-labelledby' };
  }
  if (sourceKey === 'aria-label') {
    return { text: SOURCES['aria-label'].text, origin: 'aria-label' };
  }
  if (sourceKey === 'texte') {
    return { text: SOURCES.texte.text, origin: 'contenu texte' };
  }
  return { text: '', origin: 'rôle seul' };
}

/* Verdict de qualité du nom : vide = annonce dégradée. */
function nameVerdict(name) {
  if (!name.text) return 'Nom vide : seul le rôle « ' + ROLES[S.role].label + ' » est annoncé.';
  if (name.text.length > 40) return 'Nom long (' + name.text.length + ' caractères) : il gagne à être concis.';
  return 'Nom explicite via ' + name.origin + ' (' + name.text.length + ' caractères).';
}

/* Relevé réel sur les marqueurs du DOM — aucun chiffre inventé. */
function measure() {
  const scope = S.nodes.panel ? (S.nodes.panel.ownerDocument || document) : document;
  const markers = Array.prototype.slice.call(
    scope.querySelectorAll ? scope.querySelectorAll('.geo-marker') : []
  );
  const total = markers.length;
  let withRole = 0;
  let withName = 0;
  let inTabOrder = 0;
  let pressed = 0;
  markers.forEach((m) => {
    if (m.getAttribute('role')) withRole += 1;
    if (m.getAttribute('aria-label') || m.getAttribute('aria-labelledby')) withName += 1;
    if (m.getAttribute('tabindex') === '0') inTabOrder += 1;
    if (m.getAttribute('aria-pressed') === 'true') pressed += 1;
  });
  const namedPct = total ? (withName / total) * 100 : 0;
  return {
    total, withRole, withName, inTabOrder, pressed,
    namedPct,
    reference: 100,
  };
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#geography-e042-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e042-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e042-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e042-panel p{margin:5px 0;max-width:68ch}
#geography-e042-panel .geography-e042-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-e042-panel table{
  width:100%;border-collapse:collapse;margin:8px 0;font-size:10px;font-variant-numeric:tabular-nums;
}
#geography-e042-panel caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e042-panel th,#geography-e042-panel td{
  border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top;
}
#geography-e042-panel th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e042-panel fieldset{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-e042-panel legend{padding:0 4px;color:var(--muted)}
#geography-e042-panel .geography-e042-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#geography-e042-panel .geography-e042-choix input{
  min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f);
}
#geography-e042-panel code{
  font-family:ui-monospace,SFMono-Regular,Consolas,monospace;
  color:var(--gold-bright,#f4d69e);font-size:10px;
}
#geography-e042-name-value{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e042-canvas{
  display:block;width:100%;height:230px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-e042-legend{font-size:10px;color:var(--muted)}
#geography-e042-readout{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-e042-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-e042-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s;
}
#geography-e042-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e042-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-e042-tour .geo-ring{stroke:#ffffff;stroke-width:3}
.geography-e042-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:64%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#geography-e042-panel[data-geography-e042-reduced="1"] button,
#geography-e042-panel[data-geography-e042-reduced="1"] .geography-e042-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e042-panel button,.geography-e042-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-e042-panel{font-size:10px;padding:9px}
  #geography-e042-canvas{height:190px}
  #geography-e042-panel .geography-e042-choix{margin-right:4px}
}
`;

/* ---------- Construction du panneau (texte sémantique, lisible sans JS) ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Un rôle ARIA déclare au lecteur d’écran la nature d’un élément : « bouton » pour une action, « lien » pour une navigation, « image » pour un repère sans interaction. Sur la carte, chaque marqueur porte role="button" et un aria-label : il est donc annoncé comme un bouton nommé, actionnable au clavier.',
    'Le nom accessible ne se déduit pas de la couleur ni de la forme : il est calculé depuis aria-labelledby, puis aria-label, puis le contenu texte. Un marqueur sans nom n’est annoncé que par son rôle — l’information géographique disparaît pour l’outil d’assistance.',
    'L’attribut aria-pressed ne s’applique qu’à une bascule indépendante. Quand un seul lieu peut être actif, le motif « groupe de boutons radio » (role="radiogroup" / radio) décrit plus justement l’exclusivité de la sélection que l’accumulation de boutons pressés.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e042-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticRolesTable() {
  const table = document.createElement('table');
  table.id = ROLES_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Rôles candidats pour un marqueur de carte (référence : WAI-ARIA 1.2).';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Rôle', 'Forme sur le canvas', 'Quand l’employer', 'Verdict pour cette carte'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  ROLE_ORDER.forEach((key) => {
    const r = ROLES[key];
    const tr = document.createElement('tr');
    const cells = [r.label, r.shape, r.detail, r.verdict];
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

function buildInventory(m) {
  const table = document.createElement('table');
  table.id = INVENTORY_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Relevé réel des attributs ARIA sur les marqueurs présents dans le DOM.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Mesure', 'Valeur relevée', 'Référence'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const lignes = [
    ['Marqueurs dans le DOM', String(m.total), '—'],
    ['Porteurs d’un attribut role', String(m.withRole), fmt(m.total, 0)],
    ['Porteurs d’un nom accessible', String(m.withName), fmt(m.total, 0)],
    ['Dans l’ordre de tabulation (tabindex="0")', String(m.inTabOrder), '≤ ' + fmt(m.total, 0)],
    ['Marqueurs actifs (aria-pressed="true")', String(m.pressed), '1 attendu'],
    ['Marqueurs nommés (%)', fmt(m.namedPct, 0) + ' %', fmt(m.reference, 0) + ' % (objectif)'],
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

function radioFieldset(id, legendText, options, selected, name) {
  const fs = document.createElement('fieldset');
  fs.id = id;
  fs.setAttribute('role', 'radiogroup');
  const legend = document.createElement('legend');
  legend.textContent = legendText;
  fs.appendChild(legend);
  options.forEach((key) => {
    const lab = document.createElement('label');
    lab.className = 'geography-e042-choix';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.id = id + '-' + key;
    input.value = key;
    input.checked = key === selected;
    lab.appendChild(input);
    lab.appendChild(document.createTextNode(
      options === ROLE_ORDER ? ROLES[key].label : SOURCES[key].label
    ));
    fs.appendChild(lab);
  });
  return fs;
}

function ensurePanel(ctx, measureData) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      inventory: document.getElementById(INVENTORY_ID),
      roleRadios: ROLE_ORDER.map((k) => document.getElementById(ROLE_FS_ID + '-' + k)),
      sourceRadios: SOURCE_ORDER.map((k) => document.getElementById(NAME_FS_ID + '-' + k)),
      nameOut: document.getElementById(NAME_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      legend: document.getElementById(LEGEND_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      reset: document.getElementById(RESET_ID),
    };
  }

  const panel = ctx.el('section', 'geography-e042-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Rôles ARIA des marqueurs : étiqueter une carte sans la rendre muette');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Chaque marqueur de la carte est un élément interactif. Le rôle ARIA et le nom accessible décident de ce qu’un lecteur d’écran annonce et de ce que le clavier peut faire. Ce laboratoire relève les attributs réels et compare quatre rôles candidats.');

  const hInventory = ctx.el('h3', '', 'Inventaire réel des marqueurs');
  const inventoryP = ctx.el('p', '', 'Les nombres ci-dessous sont lus sur les marqueurs actuellement présents dans le DOM — aucune valeur n’est fabriquée. La couverture en nom accessible est comparée à l’objectif de 100 %.');

  const hRoles = ctx.el('h3', '', 'Quel rôle pour un marqueur ?');
  const rolesP = ctx.el('p', '', 'Le tableau confronte quatre rôles et leur pertinence pour une carte où un clic sélectionne un lieu.');

  const roleFs = radioFieldset(ROLE_FS_ID, 'Rôle ARIA du marqueur observé (choix unique)', ROLE_ORDER, S.role, 'geography-e042-role-group');
  const sourceFs = radioFieldset(NAME_FS_ID, 'Source du nom accessible (choix unique)', SOURCE_ORDER, S.source, 'geography-e042-name-group');

  const nameP = ctx.el('p', '');
  nameP.appendChild(document.createTextNode('Nom accessible calculé : '));
  const nameOut = document.createElement('span');
  nameOut.id = NAME_OUT_ID;
  nameP.appendChild(nameOut);

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Schéma d’un marqueur : la forme du contour indique le rôle (cercle pour bouton, cercle pointé pour radio, rectangle arrondi pour lien, carré pour image), le libellé dessiné donne le nom accessible. Flèches gauche et droite : changer de rôle ; flèches haut et bas : changer la source du nom ; Entrée : lancer ou arrêter le parcours.');

  const legendText = ctx.el('p', 'geography-e042-legend', 'Codes non chromatiques : cercle = bouton · cercle pointé = radio · rectangle arrondi = lien · carré = image. Trait plein = nom explicite, trait tireté = nom absent. Ces formes et libellés distinguent les états indépendamment de la couleur.');
  legendText.id = LEGEND_ID;

  const readout = ctx.el('p', 'geography-e042-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = ctx.el('button', '', S.playing ? '■ Arrêter le parcours' : '▶ Parcourir les marqueurs');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  play.setAttribute('aria-controls', CANVAS_ID);

  const reset = ctx.el('button', '', '↺ Réinitialiser');
  reset.type = 'button';
  reset.id = RESET_ID;

  panel.append(
    title, lead, staticFacts(),
    hInventory, inventoryP, buildInventory(measureData),
    hRoles, rolesP, staticRolesTable(),
    roleFs, sourceFs, nameP, canvas, legendText, readout, play, reset
  );

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    inventory: document.getElementById(INVENTORY_ID),
    roleRadios: ROLE_ORDER.map((k) => document.getElementById(ROLE_FS_ID + '-' + k)),
    sourceRadios: SOURCE_ORDER.map((k) => document.getElementById(NAME_FS_ID + '-' + k)),
    nameOut, canvas, legend: legendText, readout, play, reset,
  };
}

/* ---------- Badge textuel sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', 'geography-e042-badge', 'Accessibilité : chaque marqueur est un bouton nommé (role="button", aria-label), focalisable au clavier. Un seul lieu actif à la fois : le motif radiogroup/radio peut être préféré à aria-pressed.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Rendu du laboratoire (un seul canvas) ---------- */

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 230;
  const dpr = Math.min(2, Math.max(1, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const cx = Math.round(cssW * 0.5);
  const cy = Math.round(cssH * 0.46);
  const hitR = 40;

  /* Grille de repère (fond), sans aléatoire. */
  g.strokeStyle = 'rgba(214,207,193,.12)';
  g.lineWidth = 1;
  for (let x = 20; x < cssW; x += 32) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, cssH);
    g.stroke();
  }
  for (let y = 16; y < cssH; y += 32) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(cssW, y);
    g.stroke();
  }

  /* Cible tactile élargie (cercle extérieur tireté). */
  g.setLineDash([5, 4]);
  g.strokeStyle = 'rgba(214,207,193,.55)';
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(cx, cy, hitR, 0, Math.PI * 2);
  g.stroke();
  g.setLineDash([]);

  /* Forme du rôle, codée géométriquement (jamais par la seule couleur). */
  const shape = ROLES[S.role].shape;
  g.strokeStyle = 'rgba(244,214,158,.98)';
  g.fillStyle = 'rgba(230,185,111,.16)';
  g.lineWidth = 2.5;
  g.beginPath();
  if (shape === 'cercle' || shape === 'cercle pointé') {
    g.arc(cx, cy, hitR - 16, 0, Math.PI * 2);
  } else if (shape === 'carré') {
    const a = hitR - 16;
    g.rect(cx - a, cy - a, a * 2, a * 2);
  } else {
    const a = hitR - 14;
    g.moveTo(cx, cy - a);
    g.lineTo(cx + a, cy);
    g.lineTo(cx, cy + a);
    g.lineTo(cx - a, cy);
    g.closePath();
  }
  g.fill();
  g.stroke();

  if (shape === 'cercle pointé') {
    g.fillStyle = 'rgba(244,214,158,.98)';
    g.beginPath();
    g.arc(cx, cy, 7, 0, Math.PI * 2);
    g.fill();
  }

  /* Nom accessible : trait plein s'il existe, tireté s'il est vide. */
  const name = accessibleName(S.role, S.source);
  g.font = '12px sans-serif';
  g.textAlign = 'center';
  if (name.text) {
    g.fillStyle = 'rgba(244,214,158,.98)';
    g.fillText(name.text, cx, cy + hitR + 24, cssW - 24);
  } else {
    g.setLineDash([4, 3]);
    g.strokeStyle = 'rgba(230,185,111,.8)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(cx - 60, cy + hitR + 20);
    g.lineTo(cx + 60, cy + hitR + 20);
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = 'rgba(214,207,193,.85)';
    g.fillText('(nom absent — rôle seul)', cx, cy + hitR + 38, cssW - 24);
  }

  /* Rôle en clair, y compris hors couleur. */
  g.textAlign = 'left';
  g.fillStyle = 'rgba(214,207,193,.92)';
  g.font = '11px sans-serif';
  g.fillText('role = « ' + ROLES[S.role].label + ' »', 10, 18);
  g.fillText('nom = ' + (name.text ? '« ' + name.origin + ' »' : 'vide'), 10, 34);
}

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const m = measure();
  const name = accessibleName(S.role, S.source);
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode('Rôle choisi : '));
  n.appendChild(fort(ROLES[S.role].label));
  n.appendChild(document.createTextNode(' — ' + ROLES[S.role].verdict + ' '));
  n.appendChild(document.createTextNode(nameVerdict(name) + ' '));
  n.appendChild(document.createTextNode('Relevé : '));
  n.appendChild(fort(String(m.withName) + '/' + String(m.total)));
  n.appendChild(document.createTextNode(' marqueurs nommés, soit '));
  n.appendChild(fort(fmt(m.namedPct, 0) + ' %'));
  n.appendChild(document.createTextNode(' contre un objectif de '));
  n.appendChild(fort(fmt(m.reference, 0) + ' %'));
  n.appendChild(document.createTextNode(' ; '));
  n.appendChild(fort(String(m.pressed)));
  n.appendChild(document.createTextNode(' lieu actif sur '));
  n.appendChild(fort(String(m.total)));
  n.appendChild(document.createTextNode(' marqueurs.'));
}

function syncControls() {
  const n = S.nodes;
  if (n.roleRadios) {
    n.roleRadios.forEach((radio) => {
      if (radio) radio.checked = radio.value === S.role;
    });
  }
  if (n.sourceRadios) {
    n.sourceRadios.forEach((radio) => {
      if (radio) radio.checked = radio.value === S.source;
    });
  }
  if (n.nameOut) n.nameOut.textContent = accessibleName(S.role, S.source).text || '(aucun nom — rôle seul)';
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter le parcours' : '▶ Parcourir les marqueurs';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  updateReadout();
  drawLab();
}

/* ---------- Boucle rAF unique, pause sur document.hidden ---------- */

function clearTour() {
  S.tourNodes.forEach((node) => {
    if (node && node.classList) node.classList.remove('geography-e042-tour');
  });
}

function stopLoop() {
  if (S.rafId) {
    cancelAnimationFrame(S.rafId);
    S.rafId = 0;
  }
  S.lastTs = 0;
  clearTour();
}

function refreshTourNodes() {
  const scope = S.nodes.panel ? (S.nodes.panel.ownerDocument || document) : document;
  S.tourNodes = Array.prototype.slice.call(
    scope.querySelectorAll ? scope.querySelectorAll('.geo-marker') : []
  );
  if (S.tourIndex >= S.tourNodes.length) S.tourIndex = 0;
}

function highlightTourNode() {
  clearTour();
  if (!S.tourNodes.length) return;
  const node = S.tourNodes[S.tourIndex % S.tourNodes.length];
  if (node && node.classList) node.classList.add('geography-e042-tour');
  const label = node && node.getAttribute ? node.getAttribute('aria-label') : '';
  const readout = S.nodes.readout;
  if (readout && label) {
    readout.textContent = 'Parcours — marqueur ' + (S.tourIndex % S.tourNodes.length + 1)
      + '/' + S.tourNodes.length + ' : ' + label
      + ' (rôle ' + (node.getAttribute('role') || 'absent')
      + ', tabindex ' + (node.getAttribute('tabindex') || 'absent') + ').';
  }
}

function startLoop() {
  if (S.rafId || typeof requestAnimationFrame !== 'function') return;
  if (typeof document !== 'undefined' && document.hidden) return;
  refreshTourNodes();
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  const reduced = typeof ctxReduced() === 'boolean' ? ctxReduced() : false;
  if (S.lastTs && !reduced) {
    const dt = Math.min(120, ts - S.lastTs);
    if (dt >= 850 && S.tourNodes.length) {
      S.tourIndex = (S.tourIndex + 1) % S.tourNodes.length;
      highlightTourNode();
      S.lastTs = ts;
    }
  } else {
    highlightTourNode();
  }
  if (!S.lastTs) S.lastTs = ts;
  if (S.playing && !reduced) S.rafId = requestAnimationFrame(tick);
}

/* ctx.reducedMotion() est mémorisé à l'installation ; repli sans Exception. */
let reducedFn = () => false;
function ctxReduced() {
  try { return !!reducedFn(); }
  catch { return false; }
}

function setPlaying(value) {
  S.playing = !!value;
  if (S.playing && ctxReduced()) {
    /* Mouvement réduit : un seul pas instantané, aucune boucle. */
    refreshTourNodes();
    S.tourIndex = (S.tourIndex + 1) % Math.max(1, S.tourNodes.length);
    highlightTourNode();
  } else if (S.playing) {
    startLoop();
  } else {
    stopLoop();
  }
  syncControls();
}

function installGlobalListeners() {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else if (S.playing && !ctxReduced()) startLoop();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.dataset.geographyE042Reduced = mq.matches ? '1' : '0';
        if (mq.matches) { stopLoop(); S.playing = false; syncControls(); }
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
}

/* ---------- Point d'entrée ---------- */

register('E042', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  reducedFn = (typeof ctx.reducedMotion === 'function')
    ? ctx.reducedMotion
    : (() => {
        try {
          return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
            ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
        } catch { return false; }
      });

  const measureData = measure();
  S.nodes = ensurePanel(ctx, measureData);
  addMapBadge(ctx);

  const reduced = ctxReduced();
  S.nodes.panel.dataset.geographyE042Reduced = reduced ? '1' : '0';
  if (reduced) S.playing = false;

  /* L'inventaire est reconstruit si le nombre de marqueurs a changé. */
  if (S.nodes.fresh) {
    const n = S.nodes;
    n.roleRadios.forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.role = radio.value;
        syncControls();
      });
    });
    n.sourceRadios.forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.source = radio.value;
        syncControls();
      });
    });
    n.play.addEventListener('click', () => setPlaying(!S.playing));
    n.reset.addEventListener('click', () => {
      stopLoop();
      S.playing = false;
      S.role = 'button';
      S.source = 'aria-label';
      S.tourIndex = 0;
      syncControls();
    });
    n.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const step = event.key === 'ArrowRight' ? 1 : -1;
        const i = ROLE_ORDER.indexOf(S.role);
        S.role = ROLE_ORDER[(i + step + ROLE_ORDER.length) % ROLE_ORDER.length];
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const step = event.key === 'ArrowDown' ? 1 : -1;
        const i = SOURCE_ORDER.indexOf(S.source);
        S.source = SOURCE_ORDER[(i + step + SOURCE_ORDER.length) % SOURCE_ORDER.length];
      } else if (event.key === 'Enter' || event.key === ' ') {
        setPlaying(!S.playing);
      } else {
        used = false;
      }
      if (used) {
        event.preventDefault();
        syncControls();
      }
    });
  } else {
    /* Panneau déjà présent : rafraîchir la mesure réelle à chaque rendu. */
    const tableau = buildInventory(measureData);
    const old = document.getElementById(INVENTORY_ID);
    if (old && old.parentNode) old.parentNode.replaceChild(tableau, old);
    S.nodes.inventory = tableau;
  }

  syncControls();
  installGlobalListeners();
  if (S.playing && !reduced) startLoop();
});
