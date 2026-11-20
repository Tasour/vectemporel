import { register } from './registry.js';

/* Lentille E066 — vue GEOGRAPHIE.
 * Thème : ombres et profondeur visuelle.
 *
 * Les dix chantiers E066-01 … E066-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E066.md. Tout est local : aucune requête
 * réseau, aucune graine aléatoire, aucune console, aucun fichier partagé
 * modifié. Le contenu pédagogique est du texte sémantique réel (titres,
 * paragraphes, tableau, fieldset, légende) présent dans le DOM même sans
 * animation ; le canvas n’est qu’un laboratoire qui illustre des formules
 * déterministes.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-e066';
const PANEL_ID = 'geography-e066-panel';
const TITLE_ID = 'geography-e066-title';
const HEIGHT_ID = 'geography-e066-height';
const HEIGHT_OUT_ID = 'geography-e066-height-value';
const LIGHT_ID = 'geography-e066-light';
const LIGHT_LEFT_ID = 'geography-e066-light-gauche';
const LIGHT_RIGHT_ID = 'geography-e066-light-droite';
const SHADOW_ID = 'geography-e066-shadow';
const TABLE_ID = 'geography-e066-table';
const CANVAS_ID = 'geography-e066-canvas';
const READOUT_ID = 'geography-e066-readout';
const PLAY_ID = 'geography-e066-play';
const LEGEND_ID = 'geography-e066-legend';
const BADGE_ID = 'geography-e066-badge';

/* Constantes canoniques : aucun chiffre n’est inventé, toutes les grandeurs
   du laboratoire sont recalculées depuis ces formules. */
const ANGLE_LUMIERE = 45;       /* degrés au-dessus de l’horizon */
const RAD = Math.PI / 180;
const HAUTEUR_REF = 8;          /* px, hauteur de référence du panneau */
const HAUTEUR_MIN = 0;
const HAUTEUR_MAX = 16;
const Z_CONTROLES = 3;          /* geography.js : .geo-controls z-index: 3 */

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  height: HAUTEUR_REF,
  light: 'gauche',              /* source à gauche → ombre portée à droite */
  shadow: true,
  playing: false,
  phase: 0,
  lastTs: 0,
  rafId: 0,
  reduced: false,
  visibilityBound: false,
  motionBound: false,
  nodes: {},
};

/* ---------- Formules déterministes et formatage français ---------- */

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const fmt = (n, d) => {
  const p = Math.pow(10, d);
  return (Math.round(n * p) / p).toFixed(d).replace('.', ',');
};

/* Longueur de l’ombre portée au sol par un panneau de hauteur h, avec une
   source lumineuse à ANGLE_LUMIERE au-dessus de l’horizon : L = h / tan(α).
   À 45°, tan = 1, donc L = h — relation simple et vérifiable. */
const longueurOmbre = (h) => h / Math.tan(ANGLE_LUMIERE * RAD);

/* Décalage horizontal signé : la lumière vient de gauche (S.light) et
   l’ombre tombe à droite, ou l’inverse. Aucune information n’est portée par
   la seule couleur : une flèche et un libellé accompagnent toujours l’ombre. */
const sensOmbre = () => (S.light === 'gauche' ? 1 : -1);

/* Flou de l’ombre : plus l’objet est haut, plus l’ombre est estompée. */
const flouOmbre = (h) => 2 + 0.5 * h;

/* Opacité de l’ombre : décroît avec la hauteur (ombre plus diffuse). */
const opaciteOmbre = (h) => clamp(0.42 - h * 0.012, 0.12, 0.42);

/* Décalage vertical de l’ombre dans la perspective schématique du sol. */
const decalageVertical = (h) => 0.4 * h;

/* Chemin arrondi compatible :roundRect natif et navigateurs plus anciens. */
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

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#geography-e066-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e066-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e066-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e066-panel p{margin:5px 0;max-width:68ch}
#geography-e066-panel .geography-e066-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-e066-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#geography-e066-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e066-table th,#geography-e066-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#geography-e066-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e066-light{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-e066-light legend{padding:0 4px;color:var(--muted)}
#geography-e066-panel .geography-e066-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#geography-e066-panel .geography-e066-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#geography-e066-height{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#geography-e066-height-value{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e066-canvas{
  display:block;width:100%;height:230px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-e066-legend{font-size:10px;color:var(--muted)}
#geography-e066-readout{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-e066-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-e066-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s;
}
#geography-e066-panel button[aria-pressed="true"]{
  border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.14);
}
#geography-e066-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e066-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-e066-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:64%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#geography-e066-panel[data-geography-e066-reduced="1"] button,
#geography-e066-panel[data-geography-e066-reduced="1"] .geography-e066-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e066-panel button,.geography-e066-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-e066-panel{font-size:10px;padding:9px}
  #geography-e066-canvas{height:200px}
  #geography-e066-panel .geography-e066-choix{margin-right:4px}
}
`;

/* ---------- Construction du panneau (texte sémantique, lisible sans JS) ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'La profondeur visuelle ne vient pas que des ombres portées. Dans la vue GEOGRAPHIE, elle se construit d’abord par l’empilement : la carte .geo-map porte le fond, le SVG .geo-svg dessine les contours, les contrôles .geo-controls sont positionnés en absolu avec z-index 3, et un état vide .geo-empty recouvre la carte en inset 0 avec pointer-events:none.',
    'Le contraste et l’opacité font aussi office de profondeur : les commandes utilisent un fond sombre rgba(8,12,18,.86) qui se détache du fond clair de la carte, et le panneau latéral .geo-panel est un aside distinct du layout. Aucune box-shadow n’est nécessaire pour suggérer un plan au-dessus d’un autre ; la superposition et le contraste suffisent.',
    'Une ombre portée est un calcul déterministe, pas un décor arbitraire. Avec une source lumineuse à α degrés au-dessus de l’horizon, un panneau de hauteur h projette une ombre de longueur L = h / tan(α) ; à 45°, tan(α) = 1 et L = h. La hauteur réglable de ce laboratoire pilote le décalage, le flou et l’opacité de l’ombre, toujours comparés à une hauteur de référence de 8 px.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e066-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Les quatre mécanismes de profondeur visuelle, tels qu’ils se combinent dans la vue GEOGRAPHIE et dans le laboratoire.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Mécanisme', 'Signal technique', 'Effet de profondeur'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const lignes = [
    ['Empilement', '.geo-controls { position:absolute; z-index:3 } · .geo-empty { inset:0 }', 'Un plan au-dessus d’un autre, sans ombre dessinée.'],
    ['Contraste', 'Fond rgba(8,12,18,.86) sur .geo-map, bordures var(--line)', 'Un panneau sombre semble flotter sur un fond plus clair.'],
    ['Ombre portée', 'Décalage L = h / tan(α), flou 2 + 0,5·h', 'Un décalage et un flou proportionnels à la hauteur suggèrent l’élévation.'],
    ['Transparence', 'Opacité 0,42 − 0,012·h (bornée entre 0,12 et 0,42)', 'Une ombre plus haute devient plus diffuse, donc plus lointaine.'],
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

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    const nodes = { panel: existant, fresh: false };
    nodes.height = document.getElementById(HEIGHT_ID);
    nodes.heightOut = document.getElementById(HEIGHT_OUT_ID);
    nodes.left = document.getElementById(LIGHT_LEFT_ID);
    nodes.right = document.getElementById(LIGHT_RIGHT_ID);
    nodes.shadow = document.getElementById(SHADOW_ID);
    nodes.canvas = document.getElementById(CANVAS_ID);
    nodes.readout = document.getElementById(READOUT_ID);
    nodes.play = document.getElementById(PLAY_ID);
    nodes.legend = document.getElementById(LEGEND_ID);
    return nodes;
  }

  const panel = ctx.el('section', 'geography-e066-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Ombres et profondeur visuelle');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Sur une carte schématique, la profondeur se fabrique par empilement, contraste et ombres calculées. Ce laboratoire montre comment une hauteur d’élévation commande le décalage, le flou et l’opacité d’une ombre portée, sans jamais perdre le texte de vue.');

  const fieldset = document.createElement('fieldset');
  fieldset.id = LIGHT_ID;
  const legend = document.createElement('legend');
  legend.textContent = 'Direction de la source lumineuse (choix unique)';
  fieldset.appendChild(legend);
  const lumieres = [
    { id: LIGHT_LEFT_ID, key: 'gauche', label: 'Lumière à gauche → ombre à droite' },
    { id: LIGHT_RIGHT_ID, key: 'droite', label: 'Lumière à droite → ombre à gauche' },
  ];
  lumieres.forEach((opt) => {
    const lab = ctx.el('label', 'geography-e066-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e066-light';
    radio.id = opt.id;
    radio.value = opt.key;
    radio.checked = S.light === opt.key;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(opt.label));
    fieldset.appendChild(lab);
  });

  const shadowBtn = ctx.el('button', '', S.shadow ? '■ Masquer l’ombre portée' : '▶ Afficher l’ombre portée');
  shadowBtn.type = 'button';
  shadowBtn.id = SHADOW_ID;
  shadowBtn.setAttribute('aria-pressed', S.shadow ? 'true' : 'false');

  const note = ctx.el('p', '', 'La lumière et l’ombre portée sont deux réglages indépendants : la direction commande le sens du décalage, la bascule commande sa présence. Le libellé « OMBRE » accompagne toujours la forme projetée : aucune information n’est portée par la seule couleur.');

  const heightP = ctx.el('p', '');
  const heightLabel = document.createElement('label');
  heightLabel.setAttribute('for', HEIGHT_ID);
  heightLabel.appendChild(document.createTextNode('Hauteur d’élévation du panneau : '));
  const heightOut = document.createElement('span');
  heightOut.id = HEIGHT_OUT_ID;
  heightLabel.appendChild(heightOut);
  heightP.appendChild(heightLabel);

  const height = document.createElement('input');
  height.type = 'range';
  height.id = HEIGHT_ID;
  height.min = String(HAUTEUR_MIN);
  height.max = String(HAUTEUR_MAX);
  height.step = '1';
  height.value = String(S.height);
  height.setAttribute('aria-label', 'Hauteur d’élévation du panneau, de 0 à 16 pixels');

  const sub = ctx.el('h3', '', 'L’ombre est un calcul, pas un décor');
  const formule = ctx.el('p', '', 'Source à 45° au-dessus de l’horizon : longueur L = h / tan(45°) = h. Flou = 2 + 0,5·h. Opacité = 0,42 − 0,012·h, bornée entre 0,12 et 0,42. La hauteur de référence est 8 px.');

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Panneau flottant au-dessus d’un sol, avec son ombre portée. Flèches haut et bas : changer la hauteur d’élévation ; flèches gauche et droite : inverser la direction de la lumière. Les grandeurs chiffrées sont données en toutes lettres dans le paragraphe d’état.');

  const legendText = ctx.el('p', 'geography-e066-legend', 'Flèche « LUMIÈRE » : direction de la source · contour tireté : empreinte au sol · ombre décalée et floutée : élévation du panneau · pile à droite : ordre d’empilement de la carte (fond, SVG, contrôles z-index 3, overlay). Le mot « OMBRE » et la flèche accompagnent la forme : la couleur seule ne porte rien.');
  legendText.id = LEGEND_ID;

  const readout = ctx.el('p', 'geography-e066-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = ctx.el('button', '', S.playing ? '■ Arrêter la lévitation' : '▶ Animer la lévitation');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  panel.append(title, lead, staticFacts(), staticTable(), fieldset, shadowBtn, note, heightP, height, sub, formule, canvas, legendText, readout, play);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  const nodes = { panel, fresh: true };
  nodes.height = height;
  nodes.heightOut = heightOut;
  nodes.left = document.getElementById(LIGHT_LEFT_ID);
  nodes.right = document.getElementById(LIGHT_RIGHT_ID);
  nodes.shadow = shadowBtn;
  nodes.canvas = canvas;
  nodes.readout = readout;
  nodes.play = play;
  nodes.legend = legendText;
  return nodes;
}

/* ---------- Rendu du laboratoire (un seul canvas, une seule grille) ---------- */

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

  /* Lévitation : seul élément animé, phase purement déterministe. */
  const bob = S.playing && !S.reduced ? -3 * Math.sin(S.phase * Math.PI * 2) : 0;
  const hEff = clamp(S.height + Math.abs(bob), 0, HAUTEUR_MAX + 3);
  const sens = sensOmbre();
  const dx = sens * longueurOmbre(hEff);
  const dy = decalageVertical(hEff);
  const flou = flouOmbre(hEff);
  const opacite = opaciteOmbre(hEff);

  const solY = cssH * 0.72;
  const cardW = Math.min(150, cssW * 0.42);
  const cardH = 66;
  const cardX = cssW * 0.28 - cardW / 2;
  const cardY = solY - cardH - 42 + bob;

  /* Sol : ligne de référence et hachures, jamais une couleur seule. */
  g.strokeStyle = 'rgba(255,255,255,.16)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.beginPath();
  g.moveTo(16, solY);
  g.lineTo(cssW - 16, solY);
  g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.08)';
  for (let x = 20; x < cssW - 10; x += 18) {
    g.beginPath();
    g.moveTo(x, solY);
    g.lineTo(x - 8, solY + 10);
    g.stroke();
  }

  /* Empreinte au sol : contour tireté, repère non chromatique de l’ombre. */
  g.save();
  g.strokeStyle = 'rgba(214,207,193,.45)';
  g.setLineDash([3, 4]);
  g.strokeRect(cardX, solY - 6, cardW, 10);
  g.restore();

  /* Ombres portées : décalage, flou et opacité calculés. */
  if (S.shadow) {
    g.save();
    g.shadowColor = 'rgba(0,0,0,' + fmt(opacite, 2) + ')';
    g.shadowBlur = flou;
    g.shadowOffsetX = dx;
    g.shadowOffsetY = dy + 6;
    g.fillStyle = 'rgba(0,0,0,.55)';
    cheminArrondi(g, cardX, solY - 8, cardW, 12, 4);
    g.fill();
    g.restore();

    /* Flèche et libellé : l’ombre est nommée, pas seulement colorée. */
    const arrowX = cardX + cardW / 2 + dx * 0.5;
    g.strokeStyle = 'rgba(244,214,158,.85)';
    g.fillStyle = 'rgba(244,214,158,.85)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(cardX + cardW / 2, solY - 24);
    g.lineTo(arrowX, solY + 4 + dy * 0.2);
    g.stroke();
    g.font = '9px sans-serif';
    g.fillText('OMBRE', arrowX - 14, solY + 20 + dy * 0.2);
  } else {
    g.fillStyle = 'rgba(214,207,193,.7)';
    g.font = '9px sans-serif';
    g.fillText('Aucune ombre portée', cardX, solY + 22);
  }

  /* Source lumineuse : flèche et mot « LUMIÈRE », direction explicite. */
  const srcX = sens === 1 ? 34 : cssW - 34;
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.strokeStyle = 'rgba(244,214,158,.95)';
  g.font = '9px sans-serif';
  g.fillText('LUMIÈRE', srcX - 20, 22);
  g.beginPath();
  g.moveTo(srcX, 28);
  g.lineTo(srcX + sens * 26, 36);
  g.stroke();
  g.beginPath();
  g.moveTo(srcX + sens * 26, 36);
  g.lineTo(srcX + sens * 19, 33);
  g.lineTo(srcX + sens * 19, 39);
  g.closePath();
  g.fill();

  /* Panneau flottant : le plan supérieur. */
  g.save();
  g.fillStyle = 'rgba(230,185,111,.16)';
  g.strokeStyle = 'rgba(244,214,158,.95)';
  g.lineWidth = 2;
  cheminArrondi(g, cardX, cardY, cardW, cardH, 7);
  g.fill();
  g.stroke();
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '10px sans-serif';
  g.fillText('PANNEAU', cardX + 10, cardY + 22);
  g.fillStyle = 'rgba(214,207,193,.85)';
  g.font = '9px sans-serif';
  g.fillText('h = ' + fmt(hEff, 0) + ' px', cardX + 10, cardY + 40);
  g.restore();

  /* Pile d’empilement à droite : profondeur par z-index, pas par couleur. */
  const stackX = cssW - 118;
  const couches = [
    'overlay (inset 0)',
    'contrôles (z-index 3)',
    'SVG .geo-svg',
    'carte .geo-map',
  ];
  couches.forEach((label, i) => {
    const y = 46 + i * 26;
    g.fillStyle = i === 1 ? 'rgba(230,185,111,.18)' : 'rgba(255,255,255,.05)';
    g.strokeStyle = i === 1 ? 'rgba(244,214,158,.9)' : 'rgba(255,255,255,.22)';
    g.lineWidth = 1;
    cheminArrondi(g, stackX, y, 108, 20, 4);
    g.fill();
    g.stroke();
    g.fillStyle = 'rgba(214,207,193,.9)';
    g.font = '8px sans-serif';
    g.fillText(label, stackX + 6, y + 13);
  });
  g.fillStyle = 'rgba(214,207,193,.7)';
  g.font = '8px sans-serif';
  g.fillText('Empilement (avant → arrière)', stackX, 38);
}

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const h = S.height;
  const L = longueurOmbre(h);
  const Lref = longueurOmbre(HAUTEUR_REF);
  const flou = flouOmbre(h);
  const flouRef = flouOmbre(HAUTEUR_REF);
  const opa = opaciteOmbre(h);
  const dy = decalageVertical(h);
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode('Hauteur : '));
  n.appendChild(fort(fmt(h, 0) + ' px'));
  n.appendChild(document.createTextNode(' (référence ' + fmt(HAUTEUR_REF, 0) + ' px). Longueur de l’ombre L = h / tan(45°) = '));
  n.appendChild(fort(fmt(L, 1) + ' px'));
  n.appendChild(document.createTextNode(' (référence ' + fmt(Lref, 1) + ' px, soit '));
  n.appendChild(fort((L / Lref === 1 ? '1,00' : fmt(L / Lref, 2)) + ' ×'));
  n.appendChild(document.createTextNode('). Flou '));
  n.appendChild(fort(fmt(flou, 1) + ' px'));
  n.appendChild(document.createTextNode(' (référence ' + fmt(flouRef, 1) + ' px) · opacité '));
  n.appendChild(fort(fmt(opa, 2)));
  n.appendChild(document.createTextNode(' · décalage vertical ' + fmt(dy, 1) + ' px. Ombres '));
  n.appendChild(fort(S.shadow ? 'affichées' : 'masquées'));
  n.appendChild(document.createTextNode(', lumière à ' + (S.light === 'gauche' ? 'gauche (ombre à droite)' : 'droite (ombre à gauche)') + '. Sens et présence sont lus dans le texte et la flèche, pas dans la couleur.'));
}

function syncControls() {
  const n = S.nodes;
  if (n.height) n.height.value = String(S.height);
  if (n.heightOut) n.heightOut.textContent = fmt(S.height, 0) + ' px / ' + fmt(HAUTEUR_MAX, 0) + ' px';
  if (n.left) n.left.checked = S.light === 'gauche';
  if (n.right) n.right.checked = S.light === 'droite';
  if (n.shadow) {
    n.shadow.textContent = S.shadow ? '■ Masquer l’ombre portée' : '▶ Afficher l’ombre portée';
    n.shadow.setAttribute('aria-pressed', S.shadow ? 'true' : 'false');
  }
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter la lévitation' : '▶ Animer la lévitation';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  updateReadout();
  drawLab();
}

/* ---------- Boucle rAF unique, pause sur document.hidden ---------- */

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
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (S.playing && !S.reduced) S.phase = (S.phase + dt * 0.0006) % 1;
  }
  S.lastTs = ts;
  drawLab();
  if (S.playing && !S.reduced) S.rafId = requestAnimationFrame(tick);
}

function installGlobalListeners() {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else if (S.playing && !S.reduced) startLoop();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      S.reduced = mq.matches;
      const onChange = () => {
        S.reduced = mq.matches;
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.dataset.geographyE066Reduced = mq.matches ? '1' : '0';
        if (mq.matches) {
          S.playing = false;
          stopLoop();
        }
        syncControls();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
}

/* ---------- Badge textuel sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', 'geography-e066-badge', 'Profondeur sans ombre dessinée : empilement (.geo-controls z-index 3, .geo-empty inset 0), contraste (fond rgba(8,12,18,.86)) et transparence. Une ombre portée reste un calcul : L = h / tan(α).');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d’entrée ---------- */

register('E066', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  S.reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  S.nodes.panel.dataset.geographyE066Reduced = S.reduced ? '1' : '0';
  if (S.reduced) S.playing = false;

  syncControls();

  if (S.nodes.fresh) {
    if (S.nodes.left) S.nodes.left.addEventListener('change', () => {
      if (!S.nodes.left.checked) return;
      S.light = 'gauche';
      syncControls();
    });
    if (S.nodes.right) S.nodes.right.addEventListener('change', () => {
      if (!S.nodes.right.checked) return;
      S.light = 'droite';
      syncControls();
    });
    S.nodes.shadow.addEventListener('click', () => {
      S.shadow = !S.shadow;
      syncControls();
    });
    S.nodes.height.addEventListener('input', () => {
      S.height = clamp(Math.round(Number(S.nodes.height.value)), HAUTEUR_MIN, HAUTEUR_MAX);
      syncControls();
    });
    S.nodes.play.addEventListener('click', () => {
      S.playing = !S.playing;
      if (!S.playing) stopLoop(); else startLoop();
      syncControls();
    });
    S.nodes.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const step = event.key === 'ArrowUp' ? 1 : -1;
        S.height = clamp(S.height + step, HAUTEUR_MIN, HAUTEUR_MAX);
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        S.light = event.key === 'ArrowLeft' ? 'gauche' : 'droite';
      } else {
        used = false;
      }
      if (used) {
        event.preventDefault();
        syncControls();
      }
    });
  }

  installGlobalListeners();
  if (S.playing && !S.reduced) startLoop();
});
