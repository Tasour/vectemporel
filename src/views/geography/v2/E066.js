import { register } from './registry.js';

/* Lentille E066 (V2) — vue GEOGRAPHIE.
 * Thème : ombres et profondeur visuelle — empilement, contraste, opacité et
 * ombre portée calculée.
 *
 * Les dix chantiers E066-01 … E066-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/V2/views/E066.md. Les dix sont réellement
 * implémentés : aucun stub, aucune fonction vide. Tout est local : aucune
 * requête réseau, aucune graine aléatoire, aucune sortie de journal, aucun
 * fichier partagé modifié (passe 1, registry.js et index.js intacts).
 *
 * Le contenu pédagogique est du texte sémantique réel (h2, h3, p, table,
 * fieldset, légende, liste, région de statut) présent dans le DOM même sans
 * animation ni interaction ; le canvas n'est qu'un laboratoire qui illustre
 * des grandeurs recalculées par formule et déjà écrites en toutes lettres.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 * Préfixe unique : geography-v2-e066- (identifiants, classes, attributs,
 * noms de groupes et bloc CSS).
 *
 * Nouveautés V2 par rapport à la passe 1 : rôle `radiogroup` explicite sur le
 * choix unique de la source (pas d'aria-pressed sur les radios), `aria-valuetext`
 * maintenu à jour sur le curseur, `ctx.reducedMotion()` relu à chaque tick,
 * garde-fous d'écouteurs entre rendus, IntersectionObserver suspendant la
 * lévitation hors écran, cibles ≥ 36 px (boutons 44 px, poignées 24 px), une
 * seconde bascule indépendante pour les repères textuels et un test
 * falsifiable en cinq temps écrit dans le panneau.
 */

const P = 'geography-v2-e066';

/* Identifiants, tous préfixés geography-v2-e066-. */
const PANEL_ID = P + '-panel';
const TITLE_ID = P + '-title';
const LEAD_ID = P + '-lead';
const FAITS_ID = P + '-faits';
const FORMULE_ID = P + '-formule';
const TABLE_ID = P + '-table';
const GROUP_ID = P + '-group';
const LIGHT_LEFT_ID = P + '-light-gauche';
const LIGHT_RIGHT_ID = P + '-light-droite';
const HEIGHT_ID = P + '-height';
const HEIGHT_LABEL_ID = P + '-height-label';
const HEIGHT_OUT_ID = P + '-height-value';
const READOUT_ID = P + '-readout';
const FIGURE_ID = P + '-figure';
const CANVAS_ID = P + '-canvas';
const CAPTION_ID = P + '-caption';
const MESURES_ID = P + '-mesures';
const ACTIONS_ID = P + '-actions';
const SHADOW_ID = P + '-shadow';
const REPERES_ID = P + '-reperes';
const PLAY_ID = P + '-play';
const RESET_ID = P + '-reset';
const CLAVIER_ID = P + '-clavier';
const LIMITE_ID = P + '-limite';
const BADGE_ID = P + '-badge';
const REDUCED_ATTR = 'data-' + P + '-reduced';

/* Grandeurs de référence, toutes traçables et recalculées par formule. */
const ANGLE = 45;                 // degrés au-dessus de l'horizon
const RAD = Math.PI / 180;
const H_REF = 8;                 // hauteur de référence, pixels
const H_MIN = 0;
const H_MAX = 16;                // pixels
const NARROW = '\u202f';         // espace insécable fine
const MINUS = '\u2212';          // signe moins typographique
const TAUX_PHASE = 0.00055;      // radians de phase par milliseconde

/* Ordre d'empilement réel de la vue, lu dans la passe 1 et redessiné en texte. */
const COUCHES = [
  'overlay .geo-empty (inset 0)',
  'contrôles .geo-controls (z-index 3)',
  'contours .geo-svg',
  'fond .geo-map (min-height 260px)',
];

/* État de module : la coque reconstruit son DOM à chaque rendu, donc l'état
   survit dans S et les écouteurs globaux sont posés une seule fois. */
const S = {
  height: H_REF,
  light: 'gauche',       // source à gauche → ombre portée à droite
  shadow: true,         // bascule indépendante
  reperes: true,        // bascule indépendante pour les annotations du dessin
  playing: false,
  phase: 0,
  lastTs: 0,
  rafId: 0,
  onScreen: true,
  io: null,
  ioCanvas: null,
  visibilityBound: false,
  motionBound: false,
  renders: 0,
  nodes: {},
};

/* ctx.reducedMotion() conservé hors du point d'entrée pour la boucle rAF. */
let ctxReduced = null;

/* ---------- Formules déterministes et formatage français ---------- */

const finite = (value) => typeof value === 'number' && Number.isFinite(value);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/* Formatage décimal déterministe, sans Intl ni aléa. */
function num(value, digits) {
  if (!finite(value)) return '—';
  const fixed = Math.abs(value).toFixed(digits);
  const parts = fixed.split('.');
  const grouped = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, NARROW);
  return `${value < 0 ? MINUS : ''}${grouped}${parts[1] ? `,${parts[1]}` : ''}`;
}

const reduced = () => (typeof ctxReduced === 'function' && !!ctxReduced());

/* E066-03 — longueur de l'ombre portée au sol : L = h / tan(α).
   À 45°, tan(45°) = 1, donc L = h : relation simple et vérifiable. */
const longueurOmbre = (h) => h / Math.tan(ANGLE * RAD);

/* E066-06 — flou, opacité et décalage vertical, tous dérivés de h. */
const flouOmbre = (h) => 2 + 0.5 * h;
const opaciteOmbre = (h) => clamp(0.42 - h * 0.012, 0.12, 0.42);
const decalageVertical = (h) => 0.4 * h;

/* E066-07 — rapport à la référence de 8 px, recalculé jamais mémorisé. */
const rapportReference = (h) => longueurOmbre(h) / longueurOmbre(H_REF);

/* Sens signé : la source à gauche projette l'ombre à droite, et inversement. */
const sensOmbre = () => (S.light === 'gauche' ? 1 : -1);

/* ---------- E066-01 : bloc CSS unique, préfixé, sans réseau ---------- */

const CSS = `
#${PANEL_ID}{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-left:3px solid var(--gold,#e6b96f);
  border-radius:10px;background:rgba(255,255,255,.02);color:var(--muted,#9aa0a8);font-size:11px;line-height:1.6;
}
#${PANEL_ID} h2{margin:0 0 6px;font-size:14px;font-weight:600;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} h3{margin:12px 0 4px;font-size:11px;color:var(--ink,#e8e6e0)}
#${PANEL_ID} p{margin:5px 0;max-width:70ch}
#${PANEL_ID} .${P}-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#${PANEL_ID} .${P}-ligne{margin:0 0 7px;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
#${PANEL_ID} .${P}-ligne strong,#${PANEL_ID} .${P}-value{color:var(--gold-bright,#f4d69e);font-weight:600}
#${TABLE_ID}{width:100%;border-collapse:collapse;margin:8px 0;font-size:10px;font-variant-numeric:tabular-nums}
#${TABLE_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted,#9aa0a8)}
#${TABLE_ID} th,#${TABLE_ID} td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#${TABLE_ID} th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${GROUP_ID}{
  display:flex;flex-wrap:wrap;gap:6px;margin:8px 0;padding:8px;
  border:1px solid var(--line);border-radius:8px;
}
#${GROUP_ID} legend{padding:0 4px;color:var(--muted,#9aa0a8)}
#${PANEL_ID} .${P}-choix{
  display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:4px 8px;
  border:1px solid transparent;border-radius:8px;cursor:pointer;
}
#${PANEL_ID} .${P}-choix[data-checked="1"]{
  border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.10);color:var(--gold-bright,#f4d69e);
}
#${PANEL_ID} .${P}-choix input{min-width:18px;min-height:18px;accent-color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} label[for="${HEIGHT_ID}"]{display:block;margin-top:6px;color:var(--ink,#e8e6e0)}
#${HEIGHT_ID}{
  width:100%;min-height:36px;accent-color:var(--gold-bright,#f4d69e);
  -webkit-appearance:none;appearance:none;background:transparent;cursor:pointer;
}
#${HEIGHT_ID}::-webkit-slider-runnable-track{height:6px;border-radius:3px;background:rgba(214,207,193,.35)}
#${HEIGHT_ID}::-webkit-slider-thumb{
  -webkit-appearance:none;appearance:none;width:24px;height:24px;margin-top:-9px;
  border:1px solid var(--gold-bright,#f4d69e);border-radius:50%;background:var(--gold,#e6b96f);
}
#${HEIGHT_ID}::-moz-range-track{height:6px;border-radius:3px;background:rgba(214,207,193,.35)}
#${HEIGHT_ID}::-moz-range-thumb{
  width:24px;height:24px;border:1px solid var(--gold-bright,#f4d69e);
  border-radius:50%;background:var(--gold,#e6b96f);
}
#${READOUT_ID}{
  min-height:46px;padding:7px 9px;margin:8px 0;border:1px dashed var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--gold-bright,#f4d69e);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#${FIGURE_ID}{margin:8px 0;text-align:center}
#${CANVAS_ID}{
  display:block;width:100%;height:230px;margin:0 auto;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#${CAPTION_ID}{margin-top:5px;font-size:10px;color:var(--muted,#9aa0a8)}
#${PANEL_ID} .${P}-liste{margin:4px 0 8px;padding-left:18px}
#${PANEL_ID} .${P}-liste li{margin:0 0 4px}
#${ACTIONS_ID}{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
#${PANEL_ID} button{
  min-height:44px;min-width:44px;padding:6px 10px;border:1px solid var(--line);border-radius:8px;
  background:transparent;color:var(--gold-bright,#f4d69e);font:inherit;font-size:10px;cursor:pointer;
  transition:border-color .18s,background-color .18s;
}
#${PANEL_ID} button:hover{border-color:var(--gold,#e6b96f)}
#${PANEL_ID} button[aria-pressed="true"]{border-color:var(--gold-bright,#f4d69e);background:rgba(230,185,111,.10)}
#${PANEL_ID} button:disabled{opacity:.55;cursor:not-allowed}
#${PANEL_ID} :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.${P}-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:64%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;transition:none;
}
#${PANEL_ID}[${REDUCED_ATTR}="1"] *{transition:none!important;animation:none!important}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID} *{transition:none!important;animation:none!important;scroll-behavior:auto!important}
}
@media (max-width:620px){
  #${PANEL_ID}{padding:9px;font-size:10px}
  #${CANVAS_ID}{height:200px}
  #${PANEL_ID} .${P}-choix{margin-right:0}
}
`;

/* ---------- E066-01 : faits sémantiques, lisibles sans JS ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  wrap.id = FAITS_ID;
  const faits = [
    'La profondeur visuelle ne vient pas d’abord des ombres : dans la vue GEOGRAPHIE, elle se construit par empilement. Le fond .geo-map (min-height 260 px) porte le SVG .geo-svg qui trace les contours, les commandes .geo-controls sont positionnées en absolu avec z-index 3 (l’indice de pile qui place un plan devant un autre), et un état vide .geo-empty recouvre la carte en inset 0 avec pointer-events:none. Le panneau latéral .geo-panel est un aside distinct de la carte.',
    'Le contraste et l’opacité font aussi office de profondeur : les commandes utilisent un fond sombre rgba(8,12,18,.86) qui se détache du fond clair de la carte, tandis que les bordures suivent var(--line) et l’accent var(--gold). Aucune box-shadow n’est nécessaire pour suggérer un plan au-dessus d’un autre : la superposition et le contraste suffisent.',
    'Une ombre portée (une tache projetée sur le sol par un objet qui intercepte la lumière) est un calcul déterministe, pas un décor arbitraire. Avec une source lumineuse à α degrés au-dessus de l’horizon, un panneau de hauteur h projette une ombre de longueur L = h / tan(α), où la tangente tan est le rapport entre l’élévation et l’écartement horizontal. À 45°, tan(α) = 1 et L = h. Le flou vaut 2 + 0,5·h, l’opacité 0,42 − 0,012·h (bornée entre 0,12 et 0,42) et le décalage vertical 0,4·h. La hauteur de référence est 8 px.',
  ];
  faits.forEach((texte, i) => {
    const p = document.createElement('p');
    p.className = P + '-fait';
    p.id = P + '-fait-' + (i + 1);
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function line(ctx, parent, index, label, text, id) {
  const p = ctx.el('p', P + '-ligne');
  const strong = ctx.el('strong', '', `E066-${String(index).padStart(2, '0')} · ${label}. `);
  const span = ctx.el('span', P + '-value', text);
  if (id) span.id = id;
  p.append(strong, span);
  parent.appendChild(p);
  return span;
}

/* ---------- E066-02 : tableau sémantique des quatre mécanismes ---------- */

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
    ['Ombre portée', 'Décalage L = h / tan(45°), flou 2 + 0,5·h', 'Un décalage et un flou proportionnels à la hauteur suggèrent l’élévation.'],
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

/* ---------- Construction du panneau (texte sémantique, lisible sans JS) ---------- */

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      radios: Array.from(existant.querySelectorAll('.' + P + '-choix input')),
      labels: Array.from(existant.querySelectorAll('.' + P + '-choix')),
      height: document.getElementById(HEIGHT_ID),
      heightOut: document.getElementById(HEIGHT_OUT_ID),
      readout: document.getElementById(READOUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      shadow: document.getElementById(SHADOW_ID),
      reperes: document.getElementById(REPERES_ID),
      play: document.getElementById(PLAY_ID),
      reset: document.getElementById(RESET_ID),
    };
  }

  const panel = ctx.el('section', P + '-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);
  panel.setAttribute('data-sim', P + '-ombres-profondeur');

  const title = ctx.el('h2', '', 'Ombres et profondeur visuelle — un calcul, pas un décor (V2)');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Sur une carte schématique, la profondeur se fabrique par empilement, contraste et ombres calculées. Ce laboratoire montre comment une hauteur d’élévation commande le décalage, le flou et l’opacité d’une ombre portée, sans jamais perdre le texte de vue.');
  lead.id = LEAD_ID;

  panel.append(title, lead, staticFacts());

  /* E066-03 — la formule centrale, écrite en toutes lettres. */
  const formule = ctx.el('p', P + '-ligne', '');
  formule.id = FORMULE_ID;
  formule.append(
    ctx.el('strong', '', 'E066-03 · Formule. '),
    document.createTextNode(
      `Source à ${ANGLE}° au-dessus de l’horizon : longueur L = h / tan(${ANGLE}°) = h ; flou = 2 + 0,5·h ; opacité = 0,42 − 0,012·h (bornée entre 0,12 et 0,42) ; décalage vertical = 0,4·h. Hauteur de référence : ${H_REF} px.`,
    ),
  );
  panel.appendChild(formule);

  panel.appendChild(staticTable());

  /* E066-04 — radiogroupe explicite : choix unique, aucun aria-pressed ici. */
  const fieldset = document.createElement('fieldset');
  fieldset.id = GROUP_ID;
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.setAttribute('aria-label', 'Direction de la source lumineuse (choix unique)');
  const legend = document.createElement('legend');
  legend.textContent = 'Direction de la source lumineuse (choix unique)';
  fieldset.appendChild(legend);

  const lumieres = [
    { id: LIGHT_LEFT_ID, key: 'gauche', label: 'Lumière à gauche → ombre à droite' },
    { id: LIGHT_RIGHT_ID, key: 'droite', label: 'Lumière à droite → ombre à gauche' },
  ];
  const radios = [];
  const labels = [];
  lumieres.forEach((opt) => {
    const lab = ctx.el('label', P + '-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = P + '-light';
    radio.id = opt.id;
    radio.value = opt.key;
    radio.checked = S.light === opt.key;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(opt.label));
    radios.push(radio);
    labels.push(lab);
    fieldset.appendChild(lab);
  });
  panel.appendChild(fieldset);

  /* E066-05 — deux bascules indépendantes : aria-pressed légitime ici. */
  const shadow = ctx.el('button', '', '');
  shadow.type = 'button';
  shadow.id = SHADOW_ID;
  shadow.setAttribute('aria-controls', CANVAS_ID);
  const reperes = ctx.el('button', '', '');
  reperes.type = 'button';
  reperes.id = REPERES_ID;
  reperes.setAttribute('aria-controls', CANVAS_ID);
  panel.append(shadow, reperes);

  /* E066-03 — curseur de hauteur avec valeur vocalisée. */
  const heightLabel = ctx.el('label', '', '');
  heightLabel.id = HEIGHT_LABEL_ID;
  heightLabel.setAttribute('for', HEIGHT_ID);
  heightLabel.appendChild(document.createTextNode('Hauteur d’élévation du panneau : '));
  const heightOut = ctx.el('span', P + '-value', '');
  heightOut.id = HEIGHT_OUT_ID;
  heightLabel.appendChild(heightOut);
  panel.appendChild(heightLabel);

  const height = document.createElement('input');
  height.type = 'range';
  height.id = HEIGHT_ID;
  height.min = String(H_MIN);
  height.max = String(H_MAX);
  height.step = '1';
  height.value = String(S.height);
  height.setAttribute('aria-labelledby', HEIGHT_LABEL_ID);
  height.setAttribute('aria-label', `Hauteur d’élévation du panneau, de ${H_MIN} à ${H_MAX} pixels`);
  panel.appendChild(height);

  /* E066-07 — unique région live : toutes les grandeurs sont aussi en texte. */
  const readout = ctx.el('p', P + '-readout', '');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');
  panel.appendChild(readout);

  /* E066-06 — laboratoire canvas, redondant avec le texte. */
  const figure = ctx.el('figure', P + '-figure');
  figure.id = FIGURE_ID;
  const canvas = ctx.el('canvas', P + '-canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Panneau flottant au-dessus d’un sol avec son ombre portée. La flèche « LUMIÈRE » nomme la source, le mot « OMBRE » et le contour tireté nomment l’empreinte ; aucune information n’est portée par la couleur seule. Au clavier : flèches haut et bas pour changer la hauteur d’un pixel, flèches gauche et droite pour inverser la source, Début pour 0 pixel, Fin pour 16 pixels, Entrée ou Espace pour basculer la lévitation.');
  canvas.setAttribute('aria-describedby', CAPTION_ID);
  const caption = ctx.el('figcaption', P + '-caption', 'Schéma non à l’échelle : sol haché, empreinte tiretée, ombre décalée et floutée, panneau flottant et pile d’empilement intitulée. Toutes les valeurs sont données en texte dans le paragraphe d’état, la liste et le tableau.');
  caption.id = CAPTION_ID;
  figure.append(canvas, caption);
  panel.appendChild(figure);

  /* E066-09 — repères chiffrés, dont des comparaisons à une référence. */
  const mesures = ctx.el('ul', P + '-liste');
  mesures.id = MESURES_ID;
  const items = [
    `À ${ANGLE}°, tan(${ANGLE}°) = 1 : L = h. Référence h = ${H_REF} px → L = ${num(longueurOmbre(H_REF), 1)} px.`,
    `Doublement de la hauteur : de ${H_REF} px à ${num(H_MAX, 0)} px, L passe de ${num(longueurOmbre(H_REF), 1)} à ${num(longueurOmbre(H_MAX), 1)} px, soit un facteur ${num(rapportReference(H_MAX), 2)}.`,
    `Flou = 2 + 0,5·h : ${num(flouOmbre(H_REF), 1)} px à la référence ${H_REF} px. Opacité = 0,42 − 0,012·h : ${num(opaciteOmbre(H_REF), 2)} à ${H_REF} px, bornée entre 0,12 et 0,42.`,
    `Décalage vertical = 0,4·h : ${num(decalageVertical(H_REF), 1)} px à ${H_REF} px et ${num(decalageVertical(H_MAX), 1)} px à ${num(H_MAX, 0)} px.`,
    'Empilement : .geo-controls z-index 3, .geo-empty inset 0, fond rgba(8,12,18,.86) — la profondeur existe sans aucune box-shadow.',
  ];
  items.forEach((text, i) => {
    const item = ctx.el('li', '', text);
    item.id = P + '-mesure-' + i;
    mesures.appendChild(item);
  });
  panel.appendChild(mesures);

  /* E066-08 / E066-05 — commandes (aria-pressed réservé aux bascules). */
  const actions = ctx.el('div', P + '-actions');
  actions.id = ACTIONS_ID;
  const play = ctx.el('button', P + '-play', '');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-controls', READOUT_ID);
  const reset = ctx.el('button', P + '-reset', '');
  reset.type = 'button';
  reset.id = RESET_ID;
  actions.append(play, reset);
  panel.appendChild(actions);

  /* E066-10 — équivalent clavier et limite falsifiable en cinq temps. */
  const clavier = ctx.el('p', P + '-ligne', '');
  clavier.id = CLAVIER_ID;
  clavier.append(
    ctx.el('strong', '', 'E066-10 · Clavier. '),
    document.createTextNode(
      `Tab atteint les deux radios de la source, les deux bascules, le curseur de hauteur, le dessin, la lévitation puis la réinitialisation. Les flèches haut et bas changent la hauteur d’un pixel ; les flèches gauche et droite sur le dessin inversent la lumière ; Début place ${H_MIN} px et Fin place ${H_MAX} px ; Entrée ou Espace bascule la lévitation. Le sens et la présence de l’ombre sont toujours lus dans le texte et la flèche, jamais dans la couleur seule.`,
    ),
  );
  panel.appendChild(clavier);

  const limiteTitle = ctx.el('h3', '', 'Limites et angles morts');
  const limite = ctx.el('p', P + '-ligne', '');
  limite.id = LIMITE_ID;
  limite.append(
    ctx.el('strong', '', 'E066-10 · Limite falsifiable. '),
    document.createTextNode(
      `1) Prédire que doubler la hauteur de ${H_REF} à ${num(H_MAX, 0)} px double la longueur de l’ombre ; 2) régler le curseur sur ${H_REF} puis ${num(H_MAX, 0)} px ; 3) résultat attendu : L(${num(H_MAX, 0)}) / L(${H_REF}) = ${num(rapportReference(H_MAX), 2)} et le flou passe de ${num(flouOmbre(H_REF), 1)} à ${num(flouOmbre(H_MAX), 1)} px ; 4) falsifier : si le rapport n’est pas 2, l’hypothèse est réfutée ; 5) débrief : ce modèle à source ponctuelle à ${ANGLE}° est schématique — une source étendue produit une pénombre, une surface inclinée change la projection, et l’empilement réel de la carte (z-index, contraste, opacité) porte une profondeur que la seule ombre calculée ne décrit pas.`,
    ),
  );
  panel.append(limiteTitle, limite);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true, radios, labels, height, heightOut, readout,
    canvas, shadow, reperes, play, reset,
  };
}

/* ---------- E066-06 : dessin déterministe (un seul canvas, DPR ≤ 2) ---------- */

/* Chemin arrondi compatible : roundRect natif et navigateurs plus anciens. */
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

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = Math.max(240, cv.clientWidth || 320);
  const cssH = cv.clientHeight || 230;
  const dpr = Math.min(2, Math.max(1, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
  const pxW = Math.round(cssW * dpr);
  const pxH = Math.round(cssH * dpr);
  if (cv.width !== pxW || cv.height !== pxH) {
    cv.width = pxW;
    cv.height = pxH;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  /* Thème lu une fois, avec repli : aucun code n'est porté par la couleur seule. */
  let theme = null;
  try { theme = typeof getComputedStyle === 'function' ? getComputedStyle(cv) : null; } catch { /* repli */ }
  const color = (name, fallback) => {
    const value = theme ? theme.getPropertyValue(name).trim() : '';
    return value || fallback;
  };
  const ink = color('--ink', '#e8e6e0');
  const bright = color('--gold-bright', '#f4d69e');
  const muted = color('--muted', '#9aa0a8');

  /* Lévitation : seul élément animé, phase purement trigonométrique. */
  const bob = S.playing && !reduced() ? -3 * Math.sin(S.phase * Math.PI * 2) : 0;
  const hEff = clamp(S.height + Math.abs(bob), H_MIN, H_MAX + 3);
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

  /* Empreinte au sol : contour tireté, repère non chromatique de l'ombre. */
  g.save();
  g.strokeStyle = 'rgba(214,207,193,.45)';
  g.setLineDash([3, 4]);
  g.strokeRect(cardX, solY - 6, cardW, 10);
  g.restore();

  /* Ombres portées : décalage, flou et opacité calculés. */
  if (S.shadow) {
    g.save();
    g.shadowColor = 'rgba(0,0,0,' + num(opacite, 2).replace(',', '.') + ')';
    g.shadowBlur = flou;
    g.shadowOffsetX = dx;
    g.shadowOffsetY = dy + 6;
    g.fillStyle = 'rgba(0,0,0,.55)';
    cheminArrondi(g, cardX, solY - 8, cardW, 12, 4);
    g.fill();
    g.restore();

    if (S.reperes) {
      const arrowX = cardX + cardW / 2 + dx * 0.5;
      g.strokeStyle = bright;
      g.fillStyle = bright;
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(cardX + cardW / 2, solY - 24);
      g.lineTo(arrowX, solY + 4 + dy * 0.2);
      g.stroke();
      g.font = '9px sans-serif';
      g.fillText('OMBRE', arrowX - 14, solY + 20 + dy * 0.2);
    }
  } else if (S.reperes) {
    g.fillStyle = muted;
    g.font = '9px sans-serif';
    g.fillText('Aucune ombre portée', cardX, solY + 22);
  }

  /* Source lumineuse : flèche et mot « LUMIÈRE », direction explicite. */
  if (S.reperes) {
    const srcX = sens === 1 ? 34 : cssW - 34;
    g.fillStyle = bright;
    g.strokeStyle = bright;
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
  }

  /* Panneau flottant : le plan supérieur. */
  g.save();
  g.fillStyle = 'rgba(230,185,111,.16)';
  g.strokeStyle = bright;
  g.lineWidth = 2;
  cheminArrondi(g, cardX, cardY, cardW, cardH, 7);
  g.fill();
  g.stroke();
  g.fillStyle = bright;
  g.font = '10px sans-serif';
  g.fillText('PANNEAU', cardX + 10, cardY + 22);
  g.fillStyle = ink;
  g.font = '9px sans-serif';
  g.fillText('h = ' + num(hEff, 0) + ' px', cardX + 10, cardY + 40);
  g.restore();

  /* Pile d'empilement à droite : profondeur par z-index, pas par couleur. */
  const stackX = cssW - 140;
  COUCHES.forEach((label, i) => {
    const y = 46 + i * 26;
    g.fillStyle = i === 1 ? 'rgba(230,185,111,.18)' : 'rgba(255,255,255,.05)';
    g.strokeStyle = i === 1 ? bright : 'rgba(255,255,255,.22)';
    g.lineWidth = 1;
    cheminArrondi(g, stackX, y, 130, 20, 4);
    g.fill();
    g.stroke();
    if (S.reperes) {
      g.fillStyle = muted;
      g.font = '8px sans-serif';
      g.fillText(label, stackX + 6, y + 13);
    }
  });
  if (S.reperes) {
    g.fillStyle = muted;
    g.font = '8px sans-serif';
    g.fillText('Empilement (avant → arrière)', stackX, 38);
  }
}

/* ---------- E066-07 : region live unique ---------- */

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const h = S.height;
  const L = longueurOmbre(h);
  const Lref = longueurOmbre(H_REF);
  const flou = flouOmbre(h);
  const flouRef = flouOmbre(H_REF);
  const opa = opaciteOmbre(h);
  const dy = decalageVertical(h);
  const rapport = rapportReference(h);
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode('Hauteur : '));
  n.appendChild(fort(num(h, 0) + ' px'));
  n.appendChild(document.createTextNode(` (référence ${num(H_REF, 0)} px). Longueur de l’ombre L = h / tan(${ANGLE}°) = `));
  n.appendChild(fort(num(L, 1) + ' px'));
  n.appendChild(document.createTextNode(` (référence ${num(Lref, 1)} px, soit `));
  n.appendChild(fort(num(rapport, 2) + ' ×'));
  n.appendChild(document.createTextNode('). Flou '));
  n.appendChild(fort(num(flou, 1) + ' px'));
  n.appendChild(document.createTextNode(` (référence ${num(flouRef, 1)} px) · opacité `));
  n.appendChild(fort(num(opa, 2)));
  n.appendChild(document.createTextNode(' · décalage vertical ' + num(dy, 1) + ' px. Ombres '));
  n.appendChild(fort(S.shadow ? 'affichées' : 'masquées'));
  n.appendChild(document.createTextNode(
    `, repères ${S.reperes ? 'affichés' : 'masqués'}, lumière à `
    + (S.light === 'gauche' ? 'gauche (ombre à droite)' : 'droite (ombre à gauche)')
    + ' et lévitation ' + (S.playing && !reduced() ? 'en cours' : 'arrêtée')
    + '. Sens et présence sont lus dans le texte et la flèche, pas dans la couleur.',
  ));
}

/* Met à jour contrôles, lecture et dessin après une action. */
function syncControls() {
  const n = S.nodes;
  if (n.height) {
    n.height.value = String(S.height);
    n.height.setAttribute('aria-valuetext', `${num(S.height, 0)} pixel${S.height > 1 ? 's' : ''} sur ${num(H_MAX, 0)}, hauteur d’élévation du panneau`);
  }
  if (n.heightOut) n.heightOut.textContent = `${num(S.height, 0)} px / ${num(H_MAX, 0)} px`;
  if (n.radios) {
    n.radios.forEach((radio, i) => {
      const on = radio.value === S.light;
      radio.checked = on;
      if (n.labels && n.labels[i]) n.labels[i].dataset.checked = on ? '1' : '0';
    });
  }
  if (n.shadow) {
    n.shadow.textContent = S.shadow ? 'Masquer l’ombre portée' : 'Afficher l’ombre portée';
    n.shadow.setAttribute('aria-pressed', S.shadow ? 'true' : 'false');
  }
  if (n.reperes) {
    n.reperes.textContent = S.reperes ? 'Masquer les repères textuels' : 'Afficher les repères textuels';
    n.reperes.setAttribute('aria-pressed', S.reperes ? 'true' : 'false');
  }
  if (n.play) {
    n.play.disabled = reduced();
    n.play.textContent = reduced()
      ? 'Lévitation désactivée (mouvement réduit)'
      : (S.playing ? 'Arrêter la lévitation' : 'Lancer la lévitation');
    n.play.setAttribute('aria-pressed', S.playing && !reduced() ? 'true' : 'false');
  }
  const panel = document.getElementById(PANEL_ID);
  if (panel) panel.setAttribute(REDUCED_ATTR, reduced() ? '1' : '0');
  updateReadout();
  drawLab();
}

/* Actions déterministes, sans aléa. */
function applyHeight(value) {
  S.height = clamp(Math.round(Number(value) || 0), H_MIN, H_MAX);
  syncControls();
}

function setLight(value) {
  if (value !== 'gauche' && value !== 'droite') return;
  S.light = value;
  syncControls();
}

/* ---------- E066-08 : boucle rAF unique, pause sur document.hidden ---------- */

function stopLoop() {
  if (S.rafId) {
    cancelAnimationFrame(S.rafId);
    S.rafId = 0;
  }
  S.lastTs = 0;
}

function startLoop() {
  if (S.rafId) return;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.onScreen) return;
  if (reduced()) return;
  S.lastTs = 0;
  if (typeof requestAnimationFrame !== 'function') { tick(0); return; }
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.onScreen) return;
  if (reduced()) { S.playing = false; syncControls(); return; }
  if (S.lastTs && S.playing) {
    const dt = Math.min(80, ts - S.lastTs);
    S.phase = (S.phase + dt * TAUX_PHASE) % 1;
  }
  S.lastTs = ts;
  drawLab();
  if (S.playing && !reduced()) S.rafId = requestAnimationFrame(tick);
}

/* ---------- E066-09 : badge textuel sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', P + '-badge', '');
  badge.id = BADGE_ID;
  badge.textContent = 'Profondeur sans ombre dessinée : empilement (.geo-controls z-index 3, .geo-empty inset 0), contraste (fond rgba(8,12,18,.86)) et opacité. Une ombre portée reste un calcul : L = h / tan(α), référence 8 px.';
  map.appendChild(badge);
}

/* ---------- E066-10 : garde-fous d'écouteurs et mouvement réduit ---------- */

function installGlobalListeners() {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else if (S.playing && !reduced()) startLoop();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.setAttribute(REDUCED_ATTR, mq.matches ? '1' : '0');
        if (mq.matches) { S.playing = false; stopLoop(); }
        syncControls();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source vivante. */ }
  }
}

/* E066-08 — IntersectionObserver : suspend la lévitation hors écran. */
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

/* E066-10 — équivalent clavier du dessin. */
function onKey(event) {
  if (event.target !== S.nodes.canvas) return;
  let used = true;
  if (event.key === 'ArrowUp') applyHeight(S.height + 1);
  else if (event.key === 'ArrowDown') applyHeight(S.height - 1);
  else if (event.key === 'ArrowLeft') setLight('gauche');
  else if (event.key === 'ArrowRight') setLight('droite');
  else if (event.key === 'Home') applyHeight(H_MIN);
  else if (event.key === 'End') applyHeight(H_MAX);
  else if (event.key === 'Enter' || event.key === ' ') {
    if (reduced()) { S.playing = false; stopLoop(); syncControls(); }
    else {
      S.playing = !S.playing;
      if (!S.playing) stopLoop(); else startLoop();
      syncControls();
    }
  } else {
    used = false;
  }
  if (used) {
    event.preventDefault();
    event.stopPropagation();
  }
}

/* ---------- Point d'entrée ---------- */

register('E066', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  /* E066-01 — bloc CSS isolé, une seule fois, identifiants préfixés. */
  ctx.css('geography-v2-e066', CSS);

  ctxReduced = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion : null;

  const layout = ctx.layout || ctx.stage;
  S.renders += 1;
  layout.setAttribute('data-' + P + '-render', String(S.renders));
  layout.setAttribute('data-' + P + '-hauteur', String(S.height));
  layout.setAttribute('data-' + P + '-source', S.light);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);
  if (reduced()) { S.playing = false; stopLoop(); }

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    n.radios.forEach((radio) => {
      radio.addEventListener('change', () => {
        if (radio.checked) setLight(radio.value);
      });
    });
    n.height.addEventListener('input', () => applyHeight(n.height.value));
    n.shadow.addEventListener('click', () => { S.shadow = !S.shadow; syncControls(); });
    n.reperes.addEventListener('click', () => { S.reperes = !S.reperes; syncControls(); });
    n.play.addEventListener('click', () => {
      if (reduced()) { S.playing = false; stopLoop(); syncControls(); return; }
      S.playing = !S.playing;
      if (!S.playing) stopLoop(); else startLoop();
      syncControls();
    });
    n.reset.addEventListener('click', () => {
      S.playing = false;
      S.phase = 0;
      stopLoop();
      S.height = H_REF;
      S.light = 'gauche';
      S.shadow = true;
      S.reperes = true;
      syncControls();
    });
    n.canvas.addEventListener('keydown', onKey);
    ensureObserver(n.canvas);
  }

  installGlobalListeners();
  if (S.playing && !reduced()) startLoop();
});
