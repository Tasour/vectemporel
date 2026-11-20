import { register } from './registry.js';

/* Lentille V2 E042 — vue GEOGRAPHIE.
 * Thème : rôles ARIA des marqueurs — étiqueter une carte sans la rendre muette.
 *
 * Les dix chantiers E042-01 … E042-10 sont réellement implémentés ci-dessous :
 *  01 section sémantique d'introduction + limite falsifiable (lisible sans JS)
 *  02 trois faits sourcés sur les rôles et le nom accessible
 *  03 tableau comparatif de quatre rôles ARIA (référence WAI-ARIA 1.2)
 *  04 inventaire réel des attributs relevés sur les marqueurs du DOM
 *  05 sélecteur de rôle en radiogroup à choix unique
 *  06 sélecteur de source du nom accessible en radiogroup
 *  07 calcul déterministe du nom accessible, verdict et graine affichée
 *  08 laboratoire canvas à formes non chromatiques, DPR ≤ 2, clavier
 *  09 parcours animé, une seule boucle rAF, pause sur document.hidden
 *  10 readout live, mouvement réduit, badge textuel et robustesse d'état
 *
 * Tout est local : aucun appel réseau, aucun tirage aléatoire, aucun journal.
 * Le contenu pédagogique est du texte sémantique inséré dans le DOM : il reste
 * lisible et indexable même sans animation ni interaction. Le canvas n'est
 * qu'un laboratoire dont chaque grandeur est aussi écrite en toutes lettres.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-v2-e042';
const P = 'geography-v2-e042';

const SEED = 0xE042; /* graine fixe et affichée, zéro tirage aléatoire. */

/* Libellé unique du canvas, avec ses équivalents clavier. */
const CANVAS_ARIA = 'Schéma d’un marqueur : la forme du contour indique le rôle (cercle pour bouton, '
  + 'cercle pointé pour radio, rectangle arrondi pour lien, carré pour image), le libellé dessiné '
  + 'donne le nom accessible. Le style de trait distingue aussi le rôle. Flèches gauche et droite : '
  + 'changer de rôle ; flèches haut et bas : changer la source du nom ; Entrée : lancer ou arrêter '
  + 'le parcours.';

/* Quatre rôles candidats, avec un style de trait non chromatique par rôle. */
const ROLES = {
  button: {
    label: 'button',
    shape: 'cercle',
    dash: [],
    detail: 'Action : activer le marqueur. Le focus et la touche Entrée/Espace déclenchent l’action. C’est le rôle actuellement porté par les marqueurs de la carte.',
    verdict: 'Correct pour une action ; aria-pressed convient si l’état bascule.',
  },
  radio: {
    label: 'radio',
    shape: 'cercle pointé',
    dash: [7, 4],
    detail: 'Choix unique dans un radiogroup : une seule sélection parmi tous les lieux. Flèches pour naviguer, case cochée pour l’élément courant.',
    verdict: 'Plus exact si la carte est un choix exclusif de lieu.',
  },
  link: {
    label: 'link',
    shape: 'rectangle arrondi',
    dash: [2, 3],
    detail: 'Navigation : conduire à une autre vue ou une autre ressource. Le focus et Entrée suivent le lien.',
    verdict: 'Inadapté ici : un clic change de lieu, il ne navigue pas.',
  },
  img: {
    label: 'img',
    shape: 'carré',
    dash: [6, 2, 1, 2],
    detail: 'Image porteuse d’un nom, sans interaction. Retiré de l’ordre de tabulation, il ne répond pas au clic.',
    verdict: 'Perd l’action : à réserver à un repère purement décoratif.',
  },
};
const ROLE_ORDER = ['button', 'radio', 'link', 'img'];

/* Sources du nom accessible, par ordre de priorité (accname 1.2). */
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
  reduced: false,
  tourIndex: 0,
  lastTs: 0,
  rafId: 0,
  visBound: false,
  motionBound: false,
  tourNodes: [],
  nodes: {},
};

/* ---------- Générateur déterministe et formules (zéro tirage aléatoire) ---------- */

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Repères de fond du canvas, tirés une fois de la graine fixe : jamais
 * d'aléa à l'exécution, donc reproductibles et affichables. */
const REPERES = (() => {
  const r = mulberry32(SEED ^ 0x9E3779B9);
  return Array.from({ length: 26 }, () => ({ x: r(), y: r() }));
})();

const fmt = (n, d = 0) => {
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
  const roleLabel = ROLES[S.role].label;
  if (!name.text) return 'Nom vide : seul le rôle « ' + roleLabel + ' » est annoncé.';
  if (name.text.length > 40) {
    return 'Nom long (' + name.text.length + ' caractères) : il gagne à être concis.';
  }
  return 'Nom explicite via ' + name.origin + ' (' + name.text.length + ' caractères).';
}

/* E042-04 : relevé réel sur les marqueurs du DOM — aucun chiffre inventé. */
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
  const tabPct = total ? (inTabOrder / total) * 100 : 0;
  return {
    total, withRole, withName, inTabOrder, pressed,
    namedPct, tabPct,
    reference: 100, /* objectif de couverture en nom accessible. */
  };
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#${P}-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${P}-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${P}-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#${P}-panel p{margin:5px 0;max-width:68ch}
#${P}-panel .${P}-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#${P}-panel .${P}-limite{
  margin:6px 0;padding-left:9px;border-left:2px dashed var(--muted,#9a938a);
}
#${P}-table{
  width:100%;border-collapse:collapse;margin:8px 0;font-size:10px;font-variant-numeric:tabular-nums;
}
#${P}-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${P}-table th,#${P}-table td{
  border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top;
}
#${P}-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${P}-panel fieldset{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${P}-panel legend{padding:0 4px;color:var(--muted)}
#${P}-panel .${P}-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#${P}-panel .${P}-choix input{min-width:24px;min-height:24px;accent-color:var(--gold,#e6b96f)}
#${P}-panel code{
  font-family:ui-monospace,SFMono-Regular,Consolas,monospace;
  color:var(--gold-bright,#f4d69e);font-size:10px;
}
#${P}-name-value{color:var(--gold-bright,#f4d69e);font-weight:600}
#${P}-canvas{
  display:block;width:100%;height:230px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#${P}-legend{font-size:10px;color:var(--muted)}
#${P}-readout{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#${P}-readout strong{color:var(--gold-bright,#f4d69e)}
#${P}-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s;
}
#${P}-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#${P}-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.${P}-tour .geo-ring{stroke:#ffffff;stroke-width:3}
.${P}-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#${P}-panel[data-${P}-reduced="1"] button,
#${P}-panel[data-${P}-reduced="1"] .${P}-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #${P}-panel button,.${P}-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #${P}-panel{font-size:10px;padding:9px}
  #${P}-canvas{height:190px}
  #${P}-panel .${P}-choix{margin-right:4px}
}
`;

/* ---------- Construction du panneau (texte sémantique, lisible sans JS) ---------- */

function mk(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

/* E042-01 / 02 : faits sourcés + limite falsifiable, texte réel dans le DOM. */
function staticFacts() {
  const wrap = mk('div');
  const faits = [
    'Un rôle ARIA déclare au lecteur d’écran la nature d’un élément : « bouton » pour une action, '
      + '« lien » pour une navigation, « image » pour un repère sans interaction. Sur la carte, '
      + 'chaque marqueur porte role="button" et un aria-label : il est donc annoncé comme un bouton '
      + 'nommé, actionnable au clavier.',
    'Le nom accessible ne se déduit pas de la couleur ni de la forme : il est calculé depuis '
      + 'aria-labelledby, puis aria-label, puis le contenu texte. Un marqueur sans nom n’est '
      + 'annoncé que par son rôle — l’information géographique disparaît pour l’outil d’assistance.',
    'L’attribut aria-pressed ne s’applique qu’à une bascule indépendante. Quand un seul lieu peut '
      + 'être actif, le motif « groupe de boutons radio » (role="radiogroup" / radio) décrit plus '
      + 'justement l’exclusivité de la sélection que l’accumulation de boutons pressés.',
  ];
  faits.forEach((texte) => wrap.appendChild(mk('p', P + '-fait', texte)));
  wrap.appendChild(mk('p', P + '-limite',
    'Limite falsifiable : si la carte est un choix exclusif de lieu, le motif radiogroup/radio '
    + 'doit annoncer une seule case cochée. Si un relevé montre deux marqueurs aria-pressed="true" '
    + 'simultanément, c’est le modèle d’attributs qui est en défaut, non le lecteur d’écran : '
    + 'le tableau et l’inventaire ci-dessous permettent de vérifier cette prédiction sur le DOM réel.'));
  return wrap;
}

/* E042-03 : tableau comparatif, en-têtes balisés, aucune couleur requise. */
function staticRolesTable() {
  const table = mk('table');
  table.id = P + '-roles';
  table.appendChild(mk('caption', '',
    'Rôles candidats pour un marqueur de carte (référence : WAI-ARIA 1.2).'));

  const thead = mk('thead');
  const hr = mk('tr');
  ['Rôle', 'Forme sur le canvas', 'Quand l’employer', 'Verdict pour cette carte'].forEach((h) => {
    const th = mk('th', '', h);
    th.scope = 'col';
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = mk('tbody');
  ROLE_ORDER.forEach((key) => {
    const r = ROLES[key];
    const tr = mk('tr');
    [r.label, r.shape, r.detail, r.verdict].forEach((c, i) => {
      const cell = mk(i === 0 ? 'th' : 'td', '', c);
      if (i === 0) cell.scope = 'row';
      tr.appendChild(cell);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/* E042-04 : inventaire réel, grandeurs chiffrées comparées à une référence. */
function buildInventory(m) {
  const table = mk('table');
  table.id = P + '-inventory';
  table.appendChild(mk('caption', '',
    'Relevé réel des attributs ARIA sur les marqueurs présents dans le DOM.'));

  const thead = mk('thead');
  const hr = mk('tr');
  ['Mesure', 'Valeur relevée', 'Référence'].forEach((h) => {
    const th = mk('th', '', h);
    th.scope = 'col';
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = mk('tbody');
  const lignes = [
    ['Marqueurs dans le DOM', fmt(m.total, 0), '—'],
    ['Porteurs d’un attribut role', fmt(m.withRole, 0), fmt(m.total, 0) + ' attendus'],
    ['Porteurs d’un nom accessible', fmt(m.withName, 0), fmt(m.total, 0) + ' attendus'],
    ['Dans l’ordre de tabulation (tabindex="0")', fmt(m.inTabOrder, 0), '≤ ' + fmt(m.total, 0)],
    ['Marqueurs actifs (aria-pressed="true")', fmt(m.pressed, 0), '1 attendu (choix exclusif)'],
    ['Marqueurs nommés (%)', fmt(m.namedPct, 0) + ' %', fmt(m.reference, 0) + ' % (objectif)'],
    ['Marqueurs focalisables (%)', fmt(m.tabPct, 0) + ' %', fmt(m.reference, 0) + ' % (objectif)'],
  ];
  lignes.forEach((cells) => {
    const tr = mk('tr');
    cells.forEach((c, i) => {
      const cell = mk(i === 0 ? 'th' : 'td', '', c);
      if (i === 0) cell.scope = 'row';
      tr.appendChild(cell);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/* E042-05 / 06 : fieldsets en radiogroup à choix exclusif (pas d'aria-pressed). */
function radioFieldset(id, legendText, order, selected, name, labelOf) {
  const fs = mk('fieldset');
  fs.id = id;
  fs.setAttribute('role', 'radiogroup');
  fs.appendChild(mk('legend', '', legendText));
  order.forEach((key) => {
    const lab = mk('label', P + '-choix');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.id = id + '-' + key;
    input.value = key;
    input.checked = key === selected;
    lab.appendChild(input);
    lab.appendChild(document.createTextNode(labelOf(key)));
    fs.appendChild(lab);
  });
  return fs;
}

function ensurePanel(ctx, measureData) {
  const idPanel = P + '-panel';
  const existant = document.getElementById(idPanel);
  const roleRadios = () => ROLE_ORDER.map((k) => document.getElementById(P + '-role-' + k));
  const sourceRadios = () => SOURCE_ORDER.map((k) => document.getElementById(P + '-name-' + k));

  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      inventory: document.getElementById(P + '-inventory'),
      roleRadios: roleRadios(),
      sourceRadios: sourceRadios(),
      nameOut: document.getElementById(P + '-name-value'),
      canvas: document.getElementById(P + '-canvas'),
      legend: document.getElementById(P + '-legend'),
      readout: document.getElementById(P + '-readout'),
      play: document.getElementById(P + '-play'),
      reset: document.getElementById(P + '-reset'),
    };
  }

  const panel = ctx.el('section', P + '-panel');
  panel.id = idPanel;
  panel.setAttribute('aria-labelledby', P + '-title');

  const title = ctx.el('h2', '', 'Rôles ARIA des marqueurs : étiqueter une carte sans la rendre muette');
  title.id = P + '-title';
  const lead = ctx.el('p', '', 'Chaque marqueur de la carte est un élément interactif. Le rôle ARIA '
    + 'et le nom accessible décident de ce qu’un lecteur d’écran annonce et de ce que le clavier '
    + 'peut faire. Ce laboratoire relève les attributs réels et compare quatre rôles candidats.');

  const hInventory = ctx.el('h3', '', 'Inventaire réel des marqueurs');
  const inventoryP = ctx.el('p', '', 'Les nombres ci-dessous sont lus sur les marqueurs actuellement '
    + 'présents dans le DOM — aucune valeur n’est fabriquée. La couverture en nom accessible et en '
    + 'focalisation est comparée à l’objectif de 100 %.');
  const hRoles = ctx.el('h3', '', 'Quel rôle pour un marqueur ?');
  const rolesP = ctx.el('p', '', 'Le tableau confronte quatre rôles et leur pertinence pour une carte '
    + 'où un clic sélectionne un lieu.');

  const roleFs = radioFieldset(P + '-role', 'Rôle ARIA du marqueur observé (choix unique)',
    ROLE_ORDER, S.role, P + '-role', (k) => ROLES[k].label);
  const sourceFs = radioFieldset(P + '-name', 'Source du nom accessible (choix unique)',
    SOURCE_ORDER, S.source, P + '-name', (k) => SOURCES[k].label);

  const nameP = mk('p');
  nameP.appendChild(document.createTextNode('Nom accessible calculé : '));
  const nameOut = mk('span', P + '-name-value');
  nameOut.id = P + '-name-value';
  nameP.appendChild(nameOut);

  const canvas = document.createElement('canvas');
  canvas.id = P + '-canvas';
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', CANVAS_ARIA);

  const legendTextNode = ctx.el('p', P + '-legend', legendText());
  legendTextNode.id = P + '-legend';

  const readout = ctx.el('p', P + '-readout');
  readout.id = P + '-readout';
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = ctx.el('button', '', S.playing ? '■ Arrêter le parcours' : '▶ Parcourir les marqueurs');
  play.type = 'button';
  play.id = P + '-play';
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false'); /* bascule indépendante. */
  play.setAttribute('aria-controls', P + '-canvas');

  const reset = ctx.el('button', '', '↺ Réinitialiser');
  reset.type = 'button';
  reset.id = P + '-reset';

  panel.append(
    title, lead, staticFacts(),
    hInventory, inventoryP, buildInventory(measureData),
    hRoles, rolesP, staticRolesTable(),
    roleFs, sourceFs, nameP, canvas, legendTextNode, readout, play, reset
  );

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    inventory: document.getElementById(P + '-inventory'),
    roleRadios: roleRadios(),
    sourceRadios: sourceRadios(),
    nameOut, canvas, legend: legendTextNode, readout, play, reset,
  };
}

/* Légende textuelle : formes, traits, graines — aucune info par la seule couleur. */
function legendText() {
  const name = accessibleName(S.role, S.source);
  return 'Codes non chromatiques : cercle = bouton · cercle pointé = radio · rectangle arrondi = '
    + 'lien · carré = image. Trait plein = nom explicite, trait tireté = nom absent. Rôle « '
    + ROLES[S.role].label + ' » en trait ' + (ROLES[S.role].dash.length ? 'tireté' : 'plein')
    + ' ; nom ' + (name.text ? 'explicite via ' + name.origin : 'absent (rôle seul)')
    + '. Repères de fond tirés de la graine fixe ' + SEED + ' (' + SEED.toString(16) + ').';
}

/* ---------- E042-08 : rendu du laboratoire (un seul canvas, un dessin/frame) ---------- */

function roundedRect(g, x, y, w, h, r) {
  g.moveTo(x + r, y);
  g.lineTo(x + w - r, y);
  g.arcTo(x + w, y, x + w, y + r, r);
  g.lineTo(x + w, y + h - r);
  g.arcTo(x + w, y + h, x + w - r, y + h, r);
  g.lineTo(x + r, y + h);
  g.arcTo(x, y + h, x, y + h - r, r);
  g.lineTo(x, y + r);
  g.arcTo(x, y, x + r, y, r);
  g.closePath();
}

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

  /* Grille de repère et repères déterministes (graine SEED), sans aléa. */
  g.strokeStyle = 'rgba(214,207,193,.10)';
  g.lineWidth = 1;
  g.setLineDash([]);
  for (let x = 20; x < cssW; x += 32) {
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x, cssH); g.stroke();
  }
  for (let y = 16; y < cssH; y += 32) {
    g.beginPath(); g.moveTo(0, y); g.lineTo(cssW, y); g.stroke();
  }
  g.fillStyle = 'rgba(214,207,193,.30)';
  REPERES.forEach((pt) => {
    const px = 8 + pt.x * Math.max(0, cssW - 16);
    const py = 8 + pt.y * Math.max(0, cssH - 16);
    g.fillRect(px, py, 1.5, 1.5);
  });

  /* Cible tactile élargie (cercle extérieur tireté). */
  g.setLineDash([5, 4]);
  g.strokeStyle = 'rgba(214,207,193,.55)';
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(cx, cy, hitR, 0, Math.PI * 2);
  g.stroke();
  g.setLineDash([]);

  /* Forme du rôle, codée géométriquement et par le trait (jamais couleur seule). */
  const role = ROLES[S.role];
  const a = hitR - 16;
  g.setLineDash(role.dash);
  g.strokeStyle = 'rgba(244,214,158,.98)';
  g.fillStyle = 'rgba(230,185,111,.16)';
  g.lineWidth = 2.5;
  g.beginPath();
  if (role.shape === 'cercle' || role.shape === 'cercle pointé') {
    g.arc(cx, cy, a, 0, Math.PI * 2);
  } else if (role.shape === 'carré') {
    g.rect(cx - a, cy - a, a * 2, a * 2);
  } else {
    roundedRect(g, cx - a - 4, cy - a, (a + 4) * 2, a * 2, 10);
  }
  g.fill();
  g.stroke();
  g.setLineDash([]);

  if (role.shape === 'cercle pointé') {
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

  /* Rôle et origine du nom en clair, y compris hors couleur. */
  g.textAlign = 'left';
  g.fillStyle = 'rgba(214,207,193,.92)';
  g.font = '11px sans-serif';
  g.fillText('role = « ' + role.label + ' »', 10, 18);
  g.fillText('nom = ' + (name.text ? '« ' + name.origin + ' »' : 'vide'), 10, 34);
  g.font = '9px sans-serif';
  g.fillText('graine ' + SEED + ' (' + SEED.toString(16) + ')', 10, cssH - 8);
}

/* ---------- E042-04 / 10 : grandeurs textuelles annoncées ---------- */

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
  n.appendChild(fort(fmt(m.withName, 0) + '/' + fmt(m.total, 0)));
  n.appendChild(document.createTextNode(' marqueurs nommés, soit '));
  n.appendChild(fort(fmt(m.namedPct, 0) + ' %'));
  n.appendChild(document.createTextNode(' contre un objectif de '));
  n.appendChild(fort(fmt(m.reference, 0) + ' %'));
  n.appendChild(document.createTextNode(' ; '));
  n.appendChild(fort(fmt(m.tabPct, 0) + ' %'));
  n.appendChild(document.createTextNode(' focalisables (objectif ' + fmt(m.reference, 0) + ' %) ; '));
  n.appendChild(fort(fmt(m.pressed, 0)));
  n.appendChild(document.createTextNode(' lieu actif sur ' + fmt(m.total, 0) + ' marqueurs (référence : 1).'));
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
  if (n.legend) n.legend.textContent = legendText();
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter le parcours' : '▶ Parcourir les marqueurs';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  updateReadout();
  drawLab();
}

/* ---------- E042-09 : boucle rAF unique, pause sur document.hidden ---------- */

function clearTour() {
  S.tourNodes.forEach((node) => {
    if (node && node.classList) node.classList.remove(P + '-tour');
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
  if (node && node.classList) node.classList.add(P + '-tour');
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
  if (S.lastTs && !S.reduced) {
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
  if (S.playing && !S.reduced) S.rafId = requestAnimationFrame(tick);
}

function setPlaying(value) {
  S.playing = !!value;
  if (S.playing && S.reduced) {
    /* Mouvement réduit : un seul pas instantané, aucune boucle. */
    refreshTourNodes();
    if (S.tourNodes.length) {
      S.tourIndex = (S.tourIndex + 1) % S.tourNodes.length;
      highlightTourNode();
    }
  } else if (S.playing) {
    startLoop();
  } else {
    stopLoop();
  }
  syncControls();
}

/* ---------- E042-10 : écouteurs globaux et badge, installés une seule fois ---------- */

function installGlobalListeners() {
  if (typeof document !== 'undefined' && !S.visBound) {
    S.visBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else if (S.playing && !S.reduced) startLoop();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        S.reduced = mq.matches;
        const panel = document.getElementById(P + '-panel');
        if (panel) panel.setAttribute('data-' + P + '-reduced', S.reduced ? '1' : '0');
        if (S.reduced) { stopLoop(); S.playing = false; syncControls(); }
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
}

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  const idBadge = P + '-badge';
  if (!map || document.getElementById(idBadge)) return;
  const badge = mk('div', P + '-badge',
    'Accessibilité : chaque marqueur est un bouton nommé (role="button", aria-label), '
    + 'focalisable au clavier. Un seul lieu actif à la fois : le motif radiogroup/radio '
    + 'peut être préféré à aria-pressed.');
  badge.id = idBadge;
  map.appendChild(badge);
}

/* ---------- Point d'entrée unique ---------- */

register('E042', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  const measureData = measure();
  S.nodes = ensurePanel(ctx, measureData);
  addMapBadge(ctx);

  const reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  S.reduced = reduced;
  S.nodes.panel.setAttribute('data-' + P + '-reduced', reduced ? '1' : '0');
  if (reduced) S.playing = false;

  /* L'inventaire est reconstruit si le nombre de marqueurs a changé. */
  if (!S.nodes.fresh) {
    const tableau = buildInventory(measureData);
    const old = document.getElementById(P + '-inventory');
    if (old && old.parentNode) old.parentNode.replaceChild(tableau, old);
    S.nodes.inventory = tableau;
  } else {
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
  }

  syncControls();
  installGlobalListeners();
  if (S.playing && !S.reduced) startLoop();
});
