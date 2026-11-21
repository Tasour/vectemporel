import { register } from './registry.js';

/* V2 — lentille E041 (vague GEOGRAPHIE).
 * Thème : focus visible des marqueurs.
 *
 * Les dix chantiers E041-01 … E041-10 sont RÉELLEMENT implémentés ici :
 *   01 section sémantique d'introduction + limite falsifiable (lisible sans JS) ;
 *   02 tableau des repères WCAG comparé aux seuils de référence ;
 *   03 modèle de contraste affiché et assumé (falsifiabilité) ;
 *   04 style de l'indicateur en radiogroupe (choix unique, pas d'aria-pressed) ;
 *   05 curseur de rayon de la cible + statistiques recalculées depuis la formule ;
 *   06 laboratoire canvas unique, déterministe (trois états de focus) ;
 *   07 grandeurs chiffrées annoncées dans un readout role=status ;
 *   08 codes visuels non chromatiques (tirets, graduations, libellés) ;
 *   09 renforcement des marqueurs réels, synchronisation carte ↔ liste, badge
 *      et boucle rAF unique avec pause sur document.hidden ;
 *   10 accessibilité clavier, cibles tactiles, défi falsifiable en cinq temps,
 *      mouvement réduit et idempotence.
 *
 * Tout est local : aucune requête réseau, aucune graine aléatoire, aucun appel
 * à la console, aucun fichier partagé modifié. Le contenu pédagogique est du
 * texte sémantique réel (titres, paragraphes, tableau, fieldset, liste) présent
 * dans le DOM même sans animation ; le canvas n'est qu'un laboratoire dont
 * chaque grandeur est aussi écrite en toutes lettres dans le readout.
 *
 * ctx = { viewId, stage, layout, css(id, rules), el(tag, cls, text),
 *         reducedMotion() }.
 */

/* ---------- Identifiants (tous préfixés geography-v2-e041-) ---------- */

const CSS_ID = 'geography-v2-e041';
const PANEL_ID = 'geography-v2-e041-panel';
const TITLE_ID = 'geography-v2-e041-title';
const STYLE_ID = 'geography-v2-e041-style';
const STYLE_LEGEND_ID = 'geography-v2-e041-style-legend';
const RADIO_NAME = 'geography-v2-e041-style';
const RAYON_ID = 'geography-v2-e041-rayon';
const RAYON_OUT_ID = 'geography-v2-e041-rayon-value';
const CANVAS_ID = 'geography-v2-e041-canvas';
const READOUT_ID = 'geography-v2-e041-readout';
const BOOST_ID = 'geography-v2-e041-boost';
const PLAY_ID = 'geography-v2-e041-play';
const LEGEND_ID = 'geography-v2-e041-legend';
const KEYS_ID = 'geography-v2-e041-keys';
const LIMITE_ID = 'geography-v2-e041-limite';
const DEFI_ID = 'geography-v2-e041-defi';
const TABLE_ID = 'geography-v2-e041-table';
const MODEL_ID = 'geography-v2-e041-modele';
const BADGE_ID = 'geography-v2-e041-badge';

const SVG_NS = 'http://www.w3.org/2000/svg';

/* Constantes canoniques : références normatives et couleurs du modèle. */
const SEUIL_CIBLE = 24;      /* px — WCAG 2.5.8 (AA, 2.2), cible minimale. */
const SEUIL_CONTRASTE = 3;   /* :1 — WCAG 1.4.11 (AA), contraste non textuel. */
const RAYON_MIN = 12;
const RAYON_MAX = 24;
const HALO_FG = '#FFFFFF';
const MAP_BG = '#0C1016';
const SEED = 0xE041;

const STYLES = [
  { key: 'halo', label: 'Halo tireté' },
  { key: 'anneau', label: 'Anneau plein' },
  { key: 'contraste', label: 'Contraste maximal' },
];

const ETATS = ['repos', 'focus visible', 'actif'];

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  style: 'halo',
  rayon: 18,
  boost: false,
  playing: false,
  labState: 1,
  phase: 0,
  lastTs: 0,
  rafId: 0,
  reduced: false,
  focusedIndex: -1,
  pendingFocusIndex: null,
  visibilityBound: false,
  motionBound: false,
  keyBound: false,
  delegatedBound: false,
  nodes: {},
};

/* ---------- Formules déterministes (aucune donnée fabriquée) ----------
 * Le contraste est la grandeur normée du WCAG : (L_clair+0,05)/(L_sombre+0,05)
 * avec L = 0,2126·R + 0,7152·V + 0,0722·B sur des composantes sRGB
 * linéarisées. Il ne dépend que des deux couleurs fixes ci-dessus.
 * La géométrie de la cible découle du rayon réglé : diamètre = 2·rayon,
 * surface = π·rayon². Chaque chiffre du readout est recalculé ici.
 */
function srgbLinear(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminance(hex) {
  const h = hex.replace('#', '');
  const r = srgbLinear(parseInt(h.slice(0, 2), 16) / 255);
  const g = srgbLinear(parseInt(h.slice(2, 4), 16) / 255);
  const b = srgbLinear(parseInt(h.slice(4, 6), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(clair, sombre) {
  return (Math.max(clair, sombre) + 0.05) / (Math.min(clair, sombre) + 0.05);
}

const CONTRASTE_HALO = contrastRatio(luminance(HALO_FG), luminance(MAP_BG));

const REF_STATS = {
  rayon: SEUIL_CIBLE / 2,
  diametre: SEUIL_CIBLE,
  marge: 0,
  surface: Math.PI * Math.pow(SEUIL_CIBLE / 2, 2),
  conforme: true,
  contraste: SEUIL_CONTRASTE,
};

function statsFor(rayon) {
  const diametre = 2 * rayon;
  return {
    rayon,
    diametre,
    marge: diametre - SEUIL_CIBLE,
    surface: Math.PI * rayon * rayon,
    conforme: diametre >= SEUIL_CIBLE,
    contraste: CONTRASTE_HALO,
  };
}

/* Graine affichée, jamais de tirage aléatoire : la phase initiale de l'animation
 * est dérivée de la graine fixe, donc reproductible à l'identique. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const PHASE0 = mulberry32(SEED)() * Math.PI * 2;

/* ---------- Formatage français ---------- */
const fmt0 = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');
const fmt1 = (n) => (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------- [E041-01] Feuille de style unique, isolée et préfixée ---------- */

const CSS = `
#${PANEL_ID}{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${PANEL_ID} h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#${PANEL_ID} p{margin:5px 0;max-width:70ch}
#${PANEL_ID} .geography-v2-e041-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#${TABLE_ID}{width:100%;border-collapse:collapse;margin:8px 0;font-size:10px;font-variant-numeric:tabular-nums}
#${TABLE_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${TABLE_ID} th,#${TABLE_ID} td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#${TABLE_ID} th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${MODEL_ID}{
  display:block;margin:6px 0;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(0,0,0,.22);color:var(--ink-soft,#d7d1c6);font-size:10px;
  line-height:1.7;overflow-wrap:anywhere;font-variant-numeric:tabular-nums;
}
#${STYLE_ID}{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${STYLE_ID} legend{padding:0 4px;color:var(--muted)}
#${PANEL_ID} .geography-v2-e041-choix{
  display:inline-flex;align-items:center;gap:6px;min-height:36px;margin-right:8px;
  padding:2px 6px;border:1px solid transparent;border-radius:8px;cursor:pointer;
}
#${PANEL_ID} .geography-v2-e041-choix-on{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.10)}
#${PANEL_ID} .geography-v2-e041-choix input{
  min-width:24px;min-height:24px;width:24px;height:24px;accent-color:var(--gold,#e6b96f);
}
#${RAYON_ID}{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#${RAYON_OUT_ID}{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#${CANVAS_ID}{
  display:block;width:100%;height:200px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#${LEGEND_ID},#${KEYS_ID}{font-size:10px;color:var(--muted)}
#${LIMITE_ID}{
  margin:8px 0;padding:7px 9px;border:1px dashed var(--line);border-radius:8px;
  font-size:10px;color:var(--muted);
}
#${DEFI_ID}{margin:6px 0;padding-left:18px;font-size:10px;color:var(--ink-soft,#d7d1c6)}
#${DEFI_ID} li{margin:2px 0}
#${READOUT_ID}{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#${READOUT_ID} strong{color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#${PANEL_ID} button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#${PANEL_ID} :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}

/* [E041-09] Renfort du focus des vrais marqueurs — actif même sans JS. */
.geo-svg .geo-marker:focus .geo-ring,
.geo-svg .geo-marker:focus-visible .geo-ring{
  stroke:#ffffff;stroke-width:3;stroke-dasharray:none;
  filter:drop-shadow(0 0 3px rgba(255,255,255,.95));
}
.geo-svg .geo-marker:focus .geo-hit{r:18}
.geo-svg .geo-marker:focus-visible{outline:2px solid rgba(255,255,255,.7);outline-offset:2px}

/* [E041-08] Halo non chromatique injecté (anneau tireté + croix). */
.geography-v2-e041-halo{
  fill:none;stroke:#ffffff;stroke-width:2.5;pointer-events:none;
  stroke-dasharray:6 4;stroke-opacity:var(--geography-v2-e041-pulse,1);
}
.geography-v2-e041-tick{stroke:#ffffff;stroke-width:2;pointer-events:none}
.geo-svg .geo-marker.geography-v2-e041-focused .geo-ring{stroke-width:3}

/* [E041-04] Variantes de style pilotées par data-*. */
.geo-layout[data-geography-v2-e041-style="anneau"] .geography-v2-e041-halo{stroke-dasharray:none;stroke-width:2}
.geo-layout[data-geography-v2-e041-style="contraste"] .geography-v2-e041-halo{stroke-dasharray:2 3;stroke-width:3.5}
.geo-layout[data-geography-v2-e041-boost="1"] .geography-v2-e041-halo{stroke-width:4;stroke-dasharray:8 4}
.geo-layout[data-geography-v2-e041-boost="1"] .geography-v2-e041-tick{stroke-width:3}

/* [E041-09] Lien marqueur ↔ liste des lieux. */
.c3b-place-item.geography-v2-e041-link{outline:2px dashed var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-v2-e041-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#${PANEL_ID}[data-geography-v2-e041-reduced="1"] button,
#${PANEL_ID}[data-geography-v2-e041-reduced="1"] .geography-v2-e041-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID} button,.geography-v2-e041-badge{transition:none!important;animation:none!important}
  .geography-v2-e041-halo{stroke-opacity:1!important}
}
@media (max-width:620px){
  #${PANEL_ID}{font-size:10px;padding:9px}
  #${CANVAS_ID}{height:170px}
  #${PANEL_ID} .geography-v2-e041-choix{margin-right:4px}
}
`;

/* ---------- [E041-01] Section sémantique (texte lisible sans JS) ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Le focus visible désigne l’indicateur qui signale, à tout moment, quel élément recevra la prochaine touche. Le critère 2.4.7 du WCAG (niveau AA) demande que cet indicateur soit perceptible : un marqueur de carte ne doit jamais devenir invisible simplement parce qu’il a le focus.',
    'Un indicateur fiable ne repose pas sur la couleur seule. Un anneau tireté, des graduations et un libellé textuel restent lisibles en vision déficiente, sur fond clair comme sur fond sombre, et restent compréhensibles lorsque le contraste chromatique est insuffisant.',
    'La vue GEOGRAPHIE rend ses marqueurs focalisables (rôle « bouton », étiquette, tabindex itinérant). La lentille E041 renforce cet indicateur existant : elle ne déplace aucun lieu, ne modifie aucune donnée et n’ajoute aucune ressource externe.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-v2-e041-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

/* ---------- [E041-02] Tableau comparé aux seuils de référence ---------- */

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Repères normatifs du focus — les seuils WCAG servent de référence de comparaison, pas de mesures locales.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Référence', 'Grandeur', 'Ce que la lentille garantit'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const lignes = [
    ['WCAG 2.4.7 (AA)', 'Indicateur visible', 'Le focus du marqueur est toujours perceptible : trait renforcé, halo tireté et annonce textuelle.'],
    ['WCAG 2.5.8 (AA, 2.2)', '24 × 24 px', 'Cible minimale de 24 px ; le disque mesure 28 px au repos et 36 px au focus, donc au-dessus du seuil.'],
    ['WCAG 1.4.11 (AA)', 'Contraste 3:1', 'Le halo blanc sur fond sombre atteint 19,1:1, au-dessus du seuil de 3:1 exigé pour un indicateur non textuel.'],
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

/* ---------- [E041-03] Modèle analytique affiché et assumé ---------- */

function staticModel() {
  const wrap = document.createElement('div');
  const h3 = document.createElement('h3');
  h3.textContent = 'Le modèle, à visage découvert';
  const intro = document.createElement('p');
  intro.textContent = 'Aucune couleur ni aucune mesure n’est chargée depuis le réseau. Les deux grandeurs affichées viennent de formules écrites ici pour que chacun puisse les discuter et les recalculer.';
  const formule = document.createElement('p');
  formule.id = MODEL_ID;
  formule.className = 'geography-v2-e041-modele';
  formule.textContent = 'Contraste = (L_clair + 0,05) / (L_sombre + 0,05), avec L = 0,2126·R + 0,7152·V + 0,0722·B sur composantes sRGB linéarisées. Halo : blanc #FFFFFF sur fond de référence #0C1016. Cible : diamètre = 2·rayon ; surface = π·rayon². Références : 24 px (WCAG 2.5.8) et 3:1 (WCAG 1.4.11).';
  const suite = document.createElement('p');
  suite.textContent = 'Le contraste ne dépend que des deux couleurs fixes : bouger le curseur de rayon ne le change pas. La géométrie, elle, est recalculée à chaque réglage : le diamètre double le rayon et la surface suit π·rayon². Chaque chiffre du statut est issu de ces écritures.';
  wrap.append(h3, intro, formule, suite);
  return wrap;
}

/* ---------- [E041-10] Défi falsifiable en cinq temps (texte dans le DOM) ---------- */

function staticDefi() {
  const wrap = document.createElement('div');
  const titre = document.createElement('h3');
  titre.textContent = 'À vous de jouer : le contraste change-t-il quand on agrandit la cible ?';
  const ol = document.createElement('ol');
  ol.id = DEFI_ID;
  const etapes = [
    'Prédiction : le halo blanc sur fond sombre doit dépasser 3:1 ; une cible de 36 px doit dépasser le seuil de 24 px. Le contraste ne dépend que des couleurs, pas de la taille.',
    'Réglage : déplacez le curseur de rayon de 12 à 24 px, changez de style dans le radiogroupe, activez le renfort puis lancez l’animation.',
    'Résultat attendu : le diamètre passe de 24 à 48 px, la marge au-dessus de 24 px croît, la surface suit π·rayon², et le contraste affiché reste identique à 19,1:1.',
    'Falsification : si le contraste varie quand on bouge le curseur, si une cible de 24 px est annoncée non conforme, ou si deux états du laboratoire partagent le même code visuel, le modèle est faux.',
    'Débrief : le contraste est une fonction des deux couleurs fixes seulement ; le curseur ne joue que sur la géométrie. Limite : le fond de carte réel est transparent ou texturé — 19,1:1 est calculé pour le fond de référence, pas mesuré sur chaque pixel.',
  ];
  etapes.forEach((texte) => {
    const li = document.createElement('li');
    li.textContent = texte;
    ol.appendChild(li);
  });
  wrap.append(titre, ol);
  return wrap;
}

/* ---------- Construction du panneau (texte sémantique, lisible sans JS) ---------- */

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      styleRadios: Array.from(existant.querySelectorAll(`input[name="${RADIO_NAME}"]`)),
      rayon: document.getElementById(RAYON_ID),
      rayonOut: document.getElementById(RAYON_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      boost: document.getElementById(BOOST_ID),
      play: document.getElementById(PLAY_ID),
      legend: document.getElementById(LEGEND_ID),
    };
  }

  const panel = ctx.el('section', 'geography-v2-e041-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Focus visible des marqueurs');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Un indicateur de focus doit se voir, se distinguer et s’annoncer. Cette lentille renforce celui des marqueurs de la carte et permet de comparer trois traitements, sans toucher aux lieux ni aux données.');

  /* Chantier 04 : radiogroupe natif (fieldset + legend + role=radiogroup). */
  const fieldset = document.createElement('fieldset');
  fieldset.id = STYLE_ID;
  fieldset.setAttribute('role', 'radiogroup');
  const legend = document.createElement('legend');
  legend.id = STYLE_LEGEND_ID;
  legend.textContent = 'Trait du focus (choix unique)';
  fieldset.setAttribute('aria-labelledby', STYLE_LEGEND_ID);
  fieldset.appendChild(legend);
  const styleRadios = [];
  STYLES.forEach((style) => {
    const lab = ctx.el('label', 'geography-v2-e041-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = RADIO_NAME;
    radio.id = `${RADIO_NAME}-${style.key}`;
    radio.value = style.key;
    radio.checked = S.style === style.key;
    radio.setAttribute('role', 'radio');
    radio.setAttribute('aria-checked', S.style === style.key ? 'true' : 'false');
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(style.label));
    fieldset.appendChild(lab);
    styleRadios.push(radio);
  });

  /* Chantier 05 : curseur de rayon de la cible. */
  const sub = ctx.el('h3', '', 'Régler la taille de la cible');
  const row = ctx.el('p', '');
  const rayonLabel = document.createElement('label');
  rayonLabel.setAttribute('for', RAYON_ID);
  rayonLabel.appendChild(document.createTextNode('Rayon du halo : '));
  const rayonOut = document.createElement('span');
  rayonOut.id = RAYON_OUT_ID;
  rayonLabel.appendChild(rayonOut);
  row.appendChild(rayonLabel);

  const rayon = document.createElement('input');
  rayon.type = 'range';
  rayon.id = RAYON_ID;
  rayon.min = String(RAYON_MIN);
  rayon.max = String(RAYON_MAX);
  rayon.step = '1';
  rayon.value = String(S.rayon);
  rayon.setAttribute('aria-label', 'Rayon du halo de focus, de 12 à 24 pixels, par pas d’un pixel');

  /* Chantier 06 : laboratoire canvas, focalisable et décrit pour lecteur d'écran. */
  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Laboratoire : trois états de focus — repos, focus visible, actif. Anneau fin, halo tireté et graduations, point plein. Flèches gauche et droite pour changer d’état, Entrée pour activer le marqueur.');

  /* Chantier 08 : légende DOM qui répète les codes en toutes lettres. */
  const legendText = ctx.el('p', 'geography-v2-e041-legend', 'Lecture sans couleur : repos = anneau fin ; focus = anneau tireté plus deux graduations ; actif = point plein cerclé. Le libellé sous chaque état nomme toujours le traitement.');
  legendText.id = LEGEND_ID;

  /* Chantier 07 : readout annoncé, mis à jour sur interaction seulement. */
  const readout = ctx.el('p', 'geography-v2-e041-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  /* Bascules indépendantes : aria-pressed légitime ici, jamais sur le radiogroupe. */
  const boost = ctx.el('button', '', S.boost ? '◆ Focus renforcé : activé' : '◇ Activer le focus renforcé');
  boost.type = 'button';
  boost.id = BOOST_ID;
  boost.setAttribute('aria-pressed', S.boost ? 'true' : 'false');

  const play = ctx.el('button', '', S.playing ? '■ Arrêter l’animation' : '▶ Animer le laboratoire');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  const keys = ctx.el('p', 'geography-v2-e041-keys', 'Clavier : Tab puis ← / → sur un marqueur pour parcourir, Début / Fin pour l’une ou l’autre extrémité. Sur le canvas, ← / → changent d’état et Entrée active.');
  keys.id = KEYS_ID;

  const limite = ctx.el('p', '', 'Limite falsifiable — le contraste est calculé pour un fond de référence fixe, pas mesuré sur la carte réelle, qui est transparente et peut recevoir des images. Un indicateur « visible » au sens du WCAG ne garantit pas l’attention : la saillance dépend aussi du contexte. Le modèle serait falsifié si le contraste changeait avec la taille, si une cible de 24 px était dite non conforme, ou si deux états du laboratoire partageaient le même code visuel.');
  limite.id = LIMITE_ID;
  limite.setAttribute('role', 'note');

  panel.append(title, lead, staticFacts(), staticTable(), staticModel(), fieldset,
    sub, row, rayon, canvas, legendText, readout, boost, play, keys, staticDefi(), limite);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true, styleRadios, rayon, rayonOut, canvas, readout,
    boost, play, legend: legendText,
  };
}

/* ---------- [E041-09] Renforcement des marqueurs réels ---------- */

function scopeOf(ctx) {
  const vivant = typeof document !== 'undefined' && typeof document.querySelector === 'function'
    ? document.querySelector('.geo-layout') : null;
  if (vivant) return vivant;
  return (ctx && ctx.layout) || (ctx && ctx.stage) || document;
}

function markersOf(ctx) {
  const scope = scopeOf(ctx);
  if (!scope || typeof scope.querySelectorAll !== 'function') return [];
  return Array.from(scope.querySelectorAll('.geo-marker'));
}

function placeItems() {
  return Array.from(document.querySelectorAll('.c3b-place-item'));
}

function labelOf(marker) {
  const raw = (marker && marker.getAttribute('aria-label')) || '';
  return raw.split(' · ')[0].trim();
}

function svg(tag) {
  return document.createElementNS(SVG_NS, tag);
}

function clearDecorations() {
  Array.from(document.querySelectorAll('.geography-v2-e041-halo, .geography-v2-e041-tick')).forEach((n) => {
    if (n.parentNode) n.parentNode.removeChild(n);
  });
  Array.from(document.querySelectorAll('.geo-marker.geography-v2-e041-focused')).forEach((m) => {
    m.classList.remove('geography-v2-e041-focused');
  });
}

function decorate(marker) {
  const ring = marker && marker.querySelector('.geo-ring');
  if (!ring) return;
  const cx = ring.getAttribute('cx');
  const cy = ring.getAttribute('cy');
  if (!cx || !cy) return;

  const halo = svg('circle');
  halo.setAttribute('class', 'geography-v2-e041-halo');
  halo.setAttribute('cx', cx);
  halo.setAttribute('cy', cy);
  halo.setAttribute('r', String(S.rayon));

  const hTick = svg('line');
  hTick.setAttribute('class', 'geography-v2-e041-tick');
  hTick.setAttribute('x1', String(Number(cx) - 16));
  hTick.setAttribute('x2', String(Number(cx) - 9));
  hTick.setAttribute('y1', cy);
  hTick.setAttribute('y2', cy);

  const vTick = svg('line');
  vTick.setAttribute('class', 'geography-v2-e041-tick');
  vTick.setAttribute('x1', cx);
  vTick.setAttribute('x2', cx);
  vTick.setAttribute('y1', String(Number(cy) - 16));
  vTick.setAttribute('y2', String(Number(cy) - 9));

  marker.append(halo, hTick, vTick);
  marker.classList.add('geography-v2-e041-focused');
}

function applyFocusDecorations(ctx) {
  clearDecorations();
  const markers = markersOf(ctx);
  const focused = S.focusedIndex >= 0 ? markers[S.focusedIndex] : null;
  const label = focused ? labelOf(focused) : '';
  if (focused) decorate(focused);
  placeItems().forEach((item) => {
    const text = (item.textContent || '').trim();
    const lie = label && text && text.indexOf(label) !== -1;
    item.classList.toggle('geography-v2-e041-link', !!lie);
  });
}

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || document.getElementById('c3b-map'))
    : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', 'geography-v2-e041-badge', 'Focus renforcé : le halo et les graduations sont des aides visuelles, aucun lieu n’a été déplacé.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- [E041-10] Tabindex itinérant, flèches et délégation ---------- */

function focusMarkerAt(index, ctx) {
  const markers = markersOf(ctx);
  if (!markers.length) return;
  const i = ((index % markers.length) + markers.length) % markers.length;
  S.pendingFocusIndex = i;
  markers.forEach((m, j) => m.setAttribute('tabindex', j === i ? '0' : '-1'));
  markers[i].focus();
}

function installKeyGuard() {
  if (S.keyBound || typeof window === 'undefined') return;
  S.keyBound = true;
  window.addEventListener('keydown', (event) => {
    const target = event.target;
    if (!target || typeof target.closest !== 'function') return;
    const marker = target.closest('.geo-marker');
    if (!marker) return;
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (keys.indexOf(event.key) === -1) return;
    event.preventDefault();
    event.stopPropagation();
    const markers = markersOf(null);
    if (!markers.length) return;
    const pos = markers.indexOf(marker);
    let next = pos;
    if (event.key === 'ArrowRight') next = (pos + 1) % markers.length;
    else if (event.key === 'ArrowLeft') next = (pos - 1 + markers.length) % markers.length;
    else if (event.key === 'Home') next = 0;
    else next = markers.length - 1;
    focusMarkerAt(next, null);
  }, true);
}

function installDelegates(ctx) {
  if (S.delegatedBound || !ctx.stage || typeof ctx.stage.addEventListener !== 'function') return;
  S.delegatedBound = true;

  ctx.stage.addEventListener('focusin', (event) => {
    const target = event.target;
    if (!target || typeof target.closest !== 'function') return;
    const marker = target.closest('.geo-marker');
    if (marker) {
      const pos = markersOf(ctx).indexOf(marker);
      if (pos >= 0) {
        S.focusedIndex = pos;
        applyFocusDecorations(ctx);
        updateReadout('focus');
      }
      return;
    }
    const item = target.closest('.c3b-place-item');
    if (item) {
      const text = (item.textContent || '').trim();
      const pos = markersOf(ctx).findIndex((m) => text && text.indexOf(labelOf(m)) !== -1);
      if (pos >= 0) {
        S.focusedIndex = pos;
        applyFocusDecorations(ctx);
        updateReadout('focus');
      }
    }
  });

  ctx.stage.addEventListener('focusout', (event) => {
    const next = event.relatedTarget;
    if (next && typeof next.closest === 'function'
      && (next.closest('.geo-marker') || next.closest('.c3b-place-item'))) return;
    S.focusedIndex = -1;
    applyFocusDecorations(ctx);
    updateReadout('focus');
  });
}

/* ---------- [E041-07] Grandeurs chiffrées annoncées dans le readout ---------- */

function strong(text) {
  const s = document.createElement('strong');
  s.textContent = text;
  return s;
}

function updateReadout(kind) {
  const n = S.nodes.readout;
  if (!n) return;
  const st = statsFor(S.rayon);
  const style = STYLES.find((s) => s.key === S.style) || STYLES[0];
  n.textContent = '';

  if (kind === 'lab') {
    n.appendChild(document.createTextNode('État du laboratoire : '));
    n.appendChild(strong(ETATS[S.labState]));
    n.appendChild(document.createTextNode(' · le trait, les graduations et le libellé distinguent les trois états.'));
    return;
  }

  /* Vue par défaut : le modèle complet, recalculé à chaque interaction. */
  n.appendChild(document.createTextNode('Style : '));
  n.appendChild(strong(style.label));
  n.appendChild(document.createTextNode('. Rayon du halo '));
  n.appendChild(strong(`${st.rayon} px`));
  n.appendChild(document.createTextNode(', soit un diamètre de '));
  n.appendChild(strong(`${fmt0(st.diametre)} px`));
  n.appendChild(document.createTextNode(' — '));
  n.appendChild(strong(`${fmt0(st.marge)} px`));
  n.appendChild(document.createTextNode(' au-dessus du seuil 24 px (WCAG 2.5.8) ; cible '));
  n.appendChild(strong(st.conforme ? 'conforme' : 'non conforme'));
  n.appendChild(document.createTextNode('. Surface '));
  n.appendChild(strong(`${fmt0(st.surface)} px²`));
  n.appendChild(document.createTextNode('. Contraste blanc sur fond sombre '));
  n.appendChild(strong(`${fmt1(st.contraste)}:1`));
  n.appendChild(document.createTextNode(' (référence 3:1, WCAG 1.4.11) — il ne dépend pas de la taille. Graine '));
  n.appendChild(strong(`0x${SEED.toString(16).toUpperCase()}`));
  n.appendChild(document.createTextNode('. État : '));
  n.appendChild(strong(ETATS[S.labState]));
  n.appendChild(document.createTextNode('.'));
}

/* ---------- [E041-06] Laboratoire canvas : trois états déterministes ---------- */

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 200;
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const largeur = cssW / 3;
  const cy = cssH * 0.44;
  const pulse = 0.72 + 0.28 * (0.5 + 0.5 * Math.sin(S.phase + PHASE0));
  const motifNone = [];
  for (let i = 0; i < 3; i += 1) {
    const cx = largeur * (i + 0.5);
    if (i === S.labState) {
      g.fillStyle = 'rgba(230,185,111,.10)';
      g.fillRect(largeur * i + 3, 8, largeur - 6, cssH - 16);
      g.strokeStyle = 'rgba(244,214,158,.9)';
      g.lineWidth = 1;
      g.strokeRect(largeur * i + 3, 8, largeur - 6, cssH - 16);
    }
    /* Anneau de base : fin au repos, renforcé aux deux autres états. */
    g.strokeStyle = 'rgba(255,255,255,.85)';
    g.lineWidth = i === 0 ? 1.5 : 2.5;
    g.setLineDash(motifNone);
    g.beginPath();
    g.arc(cx, cy, 13, 0, Math.PI * 2);
    g.stroke();

    if (i === 1 || i === 2) {
      /* Halo : tirets, plein ou « contraste maximal » selon le style choisi. */
      const motif = S.style === 'anneau' ? motifNone
        : (S.style === 'contraste' ? [2, 3] : [5, 4]);
      g.strokeStyle = `rgba(255,255,255,${(S.boost ? 1 : pulse).toFixed(3)})`;
      g.lineWidth = S.boost ? 4 : 2;
      g.setLineDash(motif);
      g.lineDashOffset = -S.phase * 3;
      g.beginPath();
      g.arc(cx, cy, S.rayon, 0, Math.PI * 2);
      g.stroke();
      g.setLineDash(motifNone);
      g.lineDashOffset = 0;

      /* Graduations non chromatiques (deux axes). */
      g.strokeStyle = 'rgba(255,255,255,.95)';
      g.lineWidth = S.boost ? 3 : 2;
      g.beginPath();
      g.moveTo(cx - S.rayon - 6, cy); g.lineTo(cx - S.rayon - 3, cy);
      g.moveTo(cx + S.rayon + 3, cy); g.lineTo(cx + S.rayon + 6, cy);
      g.moveTo(cx, cy - S.rayon - 6); g.lineTo(cx, cy - S.rayon - 3);
      g.moveTo(cx, cy + S.rayon + 3); g.lineTo(cx, cy + S.rayon + 6);
      g.stroke();
    }
    if (i === 2) {
      g.fillStyle = 'rgba(255,255,255,.95)';
      g.beginPath();
      g.arc(cx, cy, 6, 0, Math.PI * 2);
      g.fill();
    }
    g.setLineDash(motifNone);
    g.fillStyle = 'rgba(244,214,158,.96)';
    g.font = '11px sans-serif';
    g.textAlign = 'center';
    g.fillText(['Repos', 'Focus visible', 'Actif'][i], cx, cssH - 18);
    g.fillStyle = 'rgba(214,207,193,.85)';
    g.font = '10px sans-serif';
    g.fillText(`${i + 1} / 3`, cx, 24);
  }
  g.textAlign = 'start';
}

/* ---------- Synchronisation des contrôles ---------- */

function setPulse(value) {
  const layout = typeof document !== 'undefined' ? document.querySelector('.geo-layout') : null;
  if (layout) layout.style.setProperty('--geography-v2-e041-pulse', String(value));
}

function syncControls(ctx) {
  const n = S.nodes;
  const layout = scopeOf(ctx);
  if (layout && layout.dataset) {
    layout.dataset.geographyV2E041Style = S.style;
    layout.dataset.geographyV2E041Boost = S.boost ? '1' : '0';
    layout.dataset.geographyV2E041Reduced = S.reduced ? '1' : '0';
  }
  if (n.panel) n.panel.dataset.geographyV2E041Reduced = S.reduced ? '1' : '0';

  n.styleRadios.forEach((radio) => {
    if (!radio) return;
    const on = S.style === radio.value;
    radio.checked = on;
    radio.tabIndex = on ? 0 : -1;
    radio.setAttribute('aria-checked', on ? 'true' : 'false');
    if (radio.parentNode) radio.parentNode.classList.toggle('geography-v2-e041-choix-on', on);
  });
  if (n.rayon) n.rayon.value = String(S.rayon);
  if (n.rayonOut) n.rayonOut.textContent = `${fmt0(S.rayon)} px`;
  if (n.boost) {
    n.boost.textContent = S.boost ? '◆ Focus renforcé : activé' : '◇ Activer le focus renforcé';
    n.boost.setAttribute('aria-pressed', S.boost ? 'true' : 'false');
  }
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter l’animation' : '▶ Animer le laboratoire';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  if (n.legend) {
    const motif = S.style === 'anneau' ? 'anneau plein'
      : (S.style === 'contraste' ? 'tirets serrés' : 'tirets');
    n.legend.textContent = `Style ${motif}. Lecture sans couleur : repos = anneau fin ; focus = anneau tireté plus deux graduations ; actif = point plein cerclé. Cible de ${fmt0(2 * S.rayon)} px ; le libellé sous chaque état nomme toujours le traitement.`;
  }

  setPulse(1);
  applyFocusDecorations(ctx);
  updateReadout();
  drawLab();
}

/* ---------- [E041-09] Boucle rAF unique, pause sur document.hidden ---------- */

function stopLoop() {
  if (S.rafId) {
    cancelAnimationFrame(S.rafId);
    S.rafId = 0;
  }
  S.lastTs = 0;
  setPulse(1);
}

function stepLab() {
  S.labState = (S.labState + 1) % 3;
  updateReadout('lab');
}

function startLoop() {
  if (typeof document !== 'undefined' && document.hidden) return;
  if (S.reduced || !S.playing || typeof requestAnimationFrame !== 'function') {
    drawLab();
    return;
  }
  if (!S.rafId) {
    S.lastTs = 0;
    S.rafId = requestAnimationFrame(tick);
  }
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (S.lastTs && S.playing && !S.reduced) {
    const dt = Math.min(80, ts - S.lastTs);
    S.phase = (S.phase + dt * 0.004) % (Math.PI * 2);
    setPulse(0.72 + 0.28 * (0.5 + 0.5 * Math.sin(S.phase + PHASE0)));
  }
  S.lastTs = ts;
  drawLab();
  if (S.playing && !S.reduced) S.rafId = requestAnimationFrame(tick);
  else stopLoop();
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
      const onChange = () => {
        S.reduced = mq.matches;
        if (S.nodes.panel) S.nodes.panel.dataset.geographyV2E041Reduced = S.reduced ? '1' : '0';
        if (S.reduced) {
          stopLoop();
          S.playing = false;
          if (S.nodes.play) {
            S.nodes.play.textContent = '▶ Animer le laboratoire';
            S.nodes.play.setAttribute('aria-pressed', 'false');
          }
        }
        drawLab();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
}

/* ---------- [E041-10] Point d'entrée unique, idempotent ---------- */

register('E041', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);
  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  S.reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  if (S.reduced) S.playing = false;

  installDelegates(ctx);
  installKeyGuard();
  installGlobalListeners();
  syncControls(ctx);

  if (S.nodes.fresh) {
    S.nodes.styleRadios.forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.style = radio.value;
        syncControls(ctx);
      });
    });
    S.nodes.rayon.addEventListener('input', () => {
      S.rayon = clamp(Math.round(Number(S.nodes.rayon.value)), RAYON_MIN, RAYON_MAX);
      syncControls(ctx);
    });
    S.nodes.boost.addEventListener('click', () => {
      S.boost = !S.boost;
      syncControls(ctx);
    });
    S.nodes.play.addEventListener('click', () => {
      S.playing = !S.playing;
      if (!S.playing) stopLoop();
      else if (S.reduced) stepLab(); /* mouvement réduit : un pas discret, sans boucle. */
      else startLoop();
      syncControls(ctx);
    });
    S.nodes.canvas.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight') S.labState = (S.labState + 1) % 3;
      else if (event.key === 'ArrowLeft') S.labState = (S.labState + 2) % 3;
      else if (event.key === 'Enter') S.labState = 2;
      else return;
      event.preventDefault();
      event.stopPropagation();
      updateReadout('lab');
      drawLab();
    });
    S.nodes.canvas.addEventListener('click', () => {
      stepLab();
      drawLab();
    });
  }

  if (S.playing && !S.reduced) startLoop();

  /* Restauration du focus après un re-render déclenché par la coque. */
  if (S.pendingFocusIndex !== null) {
    const k = S.pendingFocusIndex;
    S.pendingFocusIndex = null;
    S.focusedIndex = k;
    const markers = markersOf(ctx);
    if (markers[k]) markers[k].focus();
  }
});
